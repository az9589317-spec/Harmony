
'use client';

import type { Song, Playlist, UploadTask, RepeatMode } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  errorEmitter, 
  FirestorePermissionError
} from '@/firebase';
import {
  collection,
  collectionGroup,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  query,
  deleteDoc,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { classifyMusicGenre } from '@/ai/flows/ai-classify-uploaded-music';
import { uploadMedia } from '@/app/actions/upload';
import { useToast } from '@/hooks/use-toast';
import jsmediatags from 'jsmediatags';
import type { TagType, PictureType } from 'jsmediatags/types';


interface MusicPlayerContextType {
  songs: Song[];
  playlists: Playlist[];
  uploadTasks: UploadTask[];
  currentTrackIndex: number | null;
  isPlaying: boolean;
  currentTrack: Song | null;
  currentTime: number;
  duration: number;
  volume: number;
  activePlaylistId: string;
  isPlayerSheetOpen: boolean;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  togglePlayerSheet: () => void;
  addSong: (source: File | string, userId: string) => string; // Returns taskId
  clearCompletedTasks: () => void;
  playTrack: (trackIndex: number, playlistId?: string) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  createPlaylist: (name: string) => void;
  addSongToPlaylist: (songId: string, playlistId: string) => void;
  getPlaylistSongs: (playlistId: string) => Song[];
  getActivePlaylistSongs: () => Song[];
  setActivePlaylistId: (playlistId: string) => void;
  updateSong: (songId: string, updatedData: Partial<Song>) => Promise<void>;
  deleteSong: (songId: string) => Promise<void>;
  clearTask: (taskId: string) => void;
  toggleShuffle: () => void;
  toggleRepeatMode: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(
  undefined
);

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const allSongsQuery = useMemoFirebase(
    () => (firestore ? query(collectionGroup(firestore, 'songs')) : null),
    [firestore]
  );
  const { data: songsData } = useCollection<Song>(allSongsQuery);

  const playlistsRef = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'playlists') : null),
    [firestore, user]
  );
  const { data: playlistsData } = useCollection<Playlist>(playlistsRef);

  const [activePlaylistId, setActivePlaylistId] = useState('library');
  const [currentTrackIndexInPlaylist, setCurrentTrackIndexInPlaylist] =
    useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [isPlayerSheetOpen, setIsPlayerSheetOpen] = useState(false);

  // New state for shuffle and repeat
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');


  const songs = useMemo(() => songsData || [], [songsData]);

  const playlists: Playlist[] = useMemo(() => {
    const userPlaylists = playlistsData || [];
    const libraryPlaylist: Playlist = {
      id: 'library',
      name: 'All Songs',
      userId: user?.uid || 'anonymous',
      songIds: songs.map((s) => s.id),
      createdAt: serverTimestamp()
    };
    // If user is logged in, show their playlists, otherwise just show the library
    return user ? [libraryPlaylist, ...userPlaylists] : [libraryPlaylist];
  }, [playlistsData, songs, user]);

  const getPlaylistSongs = useCallback(
    (playlistId: string): Song[] => {
      if (playlistId.startsWith('user_')) {
        const userId = playlistId.replace('user_', '');
        return songs.filter(s => s.userId === userId);
      }

      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist) return [];
      
      return playlist.songIds
        .map((songId) => songs.find((s) => s.id === songId))
        .filter(Boolean) as Song[];
    },
    [playlists, songs]
  );

  const activePlaylistSongs = useMemo(() => getPlaylistSongs(activePlaylistId), [activePlaylistId, getPlaylistSongs]);
  
  useEffect(() => {
    const songCount = activePlaylistSongs.length;
    if (songCount === 0) {
      setShuffledIndices([]);
      return;
    }
    
    let indices = Array.from(Array(songCount).keys());

    if (isShuffled) {
      // Fisher-Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
    }
    
    setShuffledIndices(indices);

    // If a track is playing, find its new index in the shuffled/unshuffled list
    if (currentTrackIndexInPlaylist !== null) {
      const currentOriginalIndex = (shuffledIndices[currentTrackIndexInPlaylist] !== undefined) ? shuffledIndices[currentTrackIndexInPlaylist] : -1;
      if(currentOriginalIndex !== -1) {
        const newIndexInShuffledList = indices.indexOf(currentOriginalIndex);
        if (newIndexInShuffledList !== -1) {
          setCurrentTrackIndexInPlaylist(newIndexInShuffledList);
        }
      }
    }
  }, [isShuffled, activePlaylistId, songs, playlists]);


  const currentTrack =
    currentTrackIndexInPlaylist !== null && shuffledIndices[currentTrackIndexInPlaylist] !== undefined && activePlaylistSongs[shuffledIndices[currentTrackIndexInPlaylist]]
      ? activePlaylistSongs[shuffledIndices[currentTrackIndexInPlaylist]]
      : null;


  const playTrack = useCallback(
    (
      indexInOriginalPlaylist: number,
      playlistId: string = activePlaylistId
    ) => {
      
      const targetPlaylistSongs = getPlaylistSongs(playlistId);

      // Find the index in the current shuffled list that corresponds to the original index
      const shuffledIndexToPlay = shuffledIndices.indexOf(indexInOriginalPlaylist);
      const track = targetPlaylistSongs[indexInOriginalPlaylist];

      if (track && audioRef.current) {
         if (playlistId !== activePlaylistId) {
          setActivePlaylistId(playlistId);
        }
        if (track.fileUrl) {
          audioRef.current.src = track.fileUrl;
          audioRef.current.crossOrigin = 'anonymous';
        }
        // Set the index of the *shuffled* list
        setCurrentTrackIndexInPlaylist(shuffledIndexToPlay);
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((e) => console.error('Playback failed', e));
      }
    },
    [activePlaylistId, shuffledIndices, getPlaylistSongs]
  );
  
   const playNext = useCallback(() => {
    if (currentTrackIndexInPlaylist === null || shuffledIndices.length === 0) return;
    const nextIndexInShuffledList = (currentTrackIndexInPlaylist + 1) % shuffledIndices.length;
    const originalIndexToPlay = shuffledIndices[nextIndexInShuffledList];
    playTrack(originalIndexToPlay, activePlaylistId);
  }, [currentTrackIndexInPlaylist, shuffledIndices, activePlaylistId, playTrack]);


  const handleEnded = useCallback(() => {
    if (repeatMode === 'one' && currentTrackIndexInPlaylist !== null) {
      const originalIndexToPlay = shuffledIndices[currentTrackIndexInPlaylist];
      playTrack(originalIndexToPlay, activePlaylistId);
    } else if (repeatMode === 'all' || (repeatMode === 'none' && currentTrackIndexInPlaylist !== shuffledIndices.length -1) ) {
      playNext();
    } else {
      // If repeat is 'none' and it's the last song, stop playback.
      setIsPlaying(false);
      if(audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [repeatMode, playNext, playTrack, currentTrackIndexInPlaylist, activePlaylistId, shuffledIndices]);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [handleEnded]);

  const updateTaskProgress = (
    taskId: string,
    progress: Partial<UploadTask>
  ) => {
    setUploadTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, ...progress } : task
      )
    );
  };
  
  const clearCompletedTasks = () => {
    setUploadTasks(prev => prev.filter(t => t.status === 'uploading' || t.status === 'processing'));
  }
  
  const clearTask = (taskId: string) => {
    setUploadTasks(prev => prev.filter(t => t.id !== taskId));
  }

  const getAudioDuration = (source: File | string): Promise<number> => {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      audio.src = typeof source === 'string' ? source : URL.createObjectURL(source);
      audio.crossOrigin = 'anonymous'; // Important for CORS
      
      const cleanup = () => {
          if (typeof source !== 'string') {
              URL.revokeObjectURL(audio.src);
          }
      };

      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        cleanup();
      };
      audio.onerror = () => {
        console.warn("Could not read audio duration. It's likely a CORS issue with the provided URL.");
        resolve(0); // Default to 0 if duration can't be read
        cleanup();
      };
    });
  };
  
  const sourceToDataUri = (source: File | string) => {
    return new Promise<string>(async (resolve, reject) => {
      if (typeof source === 'string') {
        try {
           const response = await fetch(source);
           const blob = await response.blob();
           const reader = new FileReader();
           reader.onload = () => resolve(reader.result as string);
           reader.onerror = reject;
           reader.readAsDataURL(blob);
        } catch (error) {
          console.error("Failed to fetch from URL for AI classification due to CORS or other network issue.", error);
          reject(error);
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(source);
      }
    });
  };

  const getTags = (file: File): Promise<TagType> => {
    return new Promise((resolve, reject) => {
      jsmediatags.read(file, {
        onSuccess: (tag) => resolve(tag),
        onError: (error) => reject(error),
      });
    });
  };

  const addSong = (source: File | string, userId: string): string => {
    if (!userId || !firestore) return '';

    const taskId = uuidv4();
    const songId = uuidv4();
    const isFile = source instanceof File;
    const fileName = isFile ? source.name : source.split('/').pop() || 'Untitled';
    
    const newTask: UploadTask = {
      id: taskId,
      fileName,
      progress: 0,
      status: 'uploading',
    };
    setUploadTasks((prev) => [...prev, newTask]);

    const handleUploadAndSave = async () => {
      try {
        let downloadURL: string;
        let fileToProcess: File | string = source;

        if (isFile) {
            const formData = new FormData();
            formData.append('file', source as File);
            updateTaskProgress(taskId, { progress: 50, status: 'uploading' });
            const result = await uploadMedia(formData, 'audio');
            if (!result.success || !result.url) {
                throw new Error(result.error || 'Music upload failed on server');
            }
            downloadURL = result.url;
        } else {
            downloadURL = source as string;
        }
        
        updateTaskProgress(taskId, { progress: 100, status: 'processing' });

        let title = fileName.replace(/\.[^/.]+$/, '').replace(/(\d{2}\s)?(.*?)\s?(\d{2,3}\s?Kbps)?/i, '$2').trim();
        let artist = 'Unknown Artist';
        let albumArtUrl = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)]
        .imageUrl;
        
        let tags: TagType | null = null;
        if (isFile) {
          try {
            tags = await getTags(source as File);
            if (tags.tags.title) title = tags.tags.title;
            if (tags.tags.artist) artist = tags.tags.artist;

            const picture = tags.tags.picture as PictureType | undefined;
            if (picture) {
              const { data, format } = picture;
              const artFile = new File([new Blob(data.map(c => String.fromCharCode(c)).join(''), { type: format })], 'album-art.jpg', { type: format });
              const artFormData = new FormData();
              artFormData.append('file', artFile);
              const artUploadResult = await uploadMedia(artFormData, 'image');
              if (artUploadResult.success && artUploadResult.url) {
                albumArtUrl = artUploadResult.url;
              }
            }
          } catch(e) {
            console.warn("Could not read media tags from file.", e)
          }
        }

        const [genreResponse, duration] = await Promise.all([
          sourceToDataUri(fileToProcess).then(dataUri => classifyMusicGenre({ musicDataUri: dataUri })).catch(() => ({ genre: 'Unknown' })),
          getAudioDuration(fileToProcess),
        ]);
  
        const newSong: Song = {
          id: songId,
          userId: userId,
          title: title,
          artist: artist,
          fileUrl: downloadURL,
          duration: duration,
          genre: genreResponse.genre || 'Unknown',
          albumArtUrl: albumArtUrl,
          createdAt: serverTimestamp(),
        };
  
        const songRef = doc(firestore, 'users', userId, 'songs', newSong.id);
        await setDoc(songRef, newSong);
  
        updateTaskProgress(taskId, { status: 'success' });
        toast({
          title: "Upload Complete",
          description: `"${newSong.title}" has been added.`,
        });

        setTimeout(() => {
            clearTask(taskId);
        }, 3000); // Automatically remove after 3 seconds

      } catch (error) {
        console.error('Upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during upload.';
        updateTaskProgress(taskId, {
          status: 'error',
          error: errorMessage,
        });
        toast({
            variant: "destructive",
            title: `Upload Error: ${fileName}`,
            description: errorMessage,
        });
      }
    };

    handleUploadAndSave();
    
    return taskId;
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.error('Playback failed', e));
    }
  };

  const playPrevious = () => {
    if (currentTrackIndexInPlaylist === null || shuffledIndices.length === 0) return;
    const prevIndexInShuffledList =
      (currentTrackIndexInPlaylist - 1 + shuffledIndices.length) % shuffledIndices.length;
    const originalIndexToPlay = shuffledIndices[prevIndexInShuffledList];
    playTrack(originalIndexToPlay, activePlaylistId);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolumeState(vol);
    }
  };

  const createPlaylist = async (name: string) => {
    if (!user) return;
    const newPlaylistId = uuidv4();
    const playlistRef = doc(
      firestore,
      'users',
      user.uid,
      'playlists',
      newPlaylistId
    );
    const newPlaylist: Playlist = { id: newPlaylistId, name, userId: user.uid, songIds: [], createdAt: serverTimestamp() };
    setDoc(playlistRef, newPlaylist).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: playlistRef.path,
            operation: 'create',
            requestResourceData: newPlaylist,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const addSongToPlaylist = async (songId: string, playlistId: string) => {
    if (!user || playlistId === 'library') return;
    const playlistRef = doc(
      firestore,
      'users',
      user.uid,
      'playlists',
      playlistId
    );
    updateDoc(playlistRef, {
      songIds: arrayUnion(songId),
    }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: playlistRef.path,
            operation: 'update',
            requestResourceData: { songIds: arrayUnion(songId) },
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const updateSong = async (songId: string, updatedData: Partial<Song>) => {
    if (!user || !firestore) {
        throw new Error("User not authenticated or Firestore not available.");
    }
    const songRef = doc(firestore, 'users', user.uid, 'songs', songId);
    
    return updateDoc(songRef, updatedData).catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: songRef.path,
        operation: 'update',
        requestResourceData: updatedData,
      });
      errorEmitter.emit('permission-error', permissionError);
      // Re-throw the original error or a new one to be caught by the caller
      throw permissionError;
    });
  };
  
  const deleteSong = async (songId: string) => {
    if (!user || !firestore) {
      throw new Error("User not authenticated or Firestore not available.");
    }
    const songToDelete = songs.find(s => s.id === songId);
    if (!songToDelete || songToDelete.userId !== user.uid) {
        throw new Error("Song not found or you don't have permission to delete it.");
    }
    const songRef = doc(firestore, 'users', user.uid, 'songs', songId);
    return deleteDoc(songRef).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: songRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
  };

  const togglePlayerSheet = () => {
    setIsPlayerSheetOpen(prev => !prev);
  }

  const toggleShuffle = () => setIsShuffled(prev => !prev);

  const toggleRepeatMode = () => {
    setRepeatMode(prev => {
        if (prev === 'none') return 'all';
        if (prev === 'all') return 'one';
        return 'none';
    });
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        songs,
        playlists,
        uploadTasks,
        currentTrackIndex: currentTrackIndexInPlaylist,
        isPlaying,
        currentTrack,
        currentTime,
        duration,
        volume,
        activePlaylistId,
        isPlayerSheetOpen,
        isShuffled,
        repeatMode,
        togglePlayerSheet,
        addSong,
        clearCompletedTasks,
        playTrack,
        togglePlayPause,
        playNext,
        playPrevious,
        seek,
        setVolume,
        createPlaylist,
        addSongToPlaylist,
        getPlaylistSongs,
        getActivePlaylistSongs: () => activePlaylistSongs,
        setActivePlaylistId,
        updateSong,
        deleteSong,
        clearTask,
        toggleShuffle,
        toggleRepeatMode,
      }}
    >
      {children}
      <audio ref={audioRef} />
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};
