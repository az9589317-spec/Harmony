
'use client';

import type { Song, Playlist, UploadTask } from '@/lib/types';
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
  clearTask: (taskId: string) => void;
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

  const songs = useMemo(() => songsData || [], [songsData]);

  const playlists: Playlist[] = useMemo(() => {
    const userPlaylists = playlistsData || [];
    const libraryPlaylist: Playlist = {
      id: 'library',
      name: 'My Library',
      songIds: songs.map((s) => s.id),
      createdAt: serverTimestamp()
    };
    // If user is logged in, show their playlists, otherwise just show the library
    return user ? [libraryPlaylist, ...userPlaylists] : [libraryPlaylist];
  }, [playlistsData, songs, user]);

  const getPlaylistSongs = useCallback(
    (playlistId: string): Song[] => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist) return [];
      
      // For 'library' playlist, just return all songs
      if (playlistId === 'library') {
          return songs;
      }
      
      return playlist.songIds
        .map((songId) => songs.find((s) => s.id === songId))
        .filter(Boolean) as Song[];
    },
    [playlists, songs]
  );

  const activePlaylistSongs = getPlaylistSongs(activePlaylistId);
  const currentTrack =
    currentTrackIndexInPlaylist !== null
      ? activePlaylistSongs[currentTrackIndexInPlaylist]
      : null;

  const playTrack = useCallback(
    (
      trackIndexInPlaylist: number,
      playlistId: string = activePlaylistId
    ) => {
      if (playlistId !== activePlaylistId) {
        setActivePlaylistId(playlistId);
      }
      const targetPlaylistSongs = getPlaylistSongs(playlistId);
      const track = targetPlaylistSongs[trackIndexInPlaylist];

      if (track && audioRef.current) {
        if (track.fileUrl) {
          audioRef.current.src = track.fileUrl;
          audioRef.current.crossOrigin = 'anonymous';
        }
        setCurrentTrackIndexInPlaylist(trackIndexInPlaylist);
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((e) => console.error('Playback failed', e));
      }
    },
    [activePlaylistId, getPlaylistSongs]
  );
  
  const playNext = useCallback(() => {
    if (currentTrackIndexInPlaylist === null) return;
    const nextIndex =
      (currentTrackIndexInPlaylist + 1) % activePlaylistSongs.length;
    playTrack(nextIndex, activePlaylistId);
  }, [currentTrackIndexInPlaylist, activePlaylistSongs.length, activePlaylistId, playTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => playNext();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playNext]);

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
    if (currentTrackIndexInPlaylist === null) return;
    const prevIndex =
      (currentTrackIndexInPlaylist - 1 + activePlaylistSongs.length) %
      activePlaylistSongs.length;
    playTrack(prevIndex, activePlaylistId);
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
    const newPlaylist: Playlist = { id: newPlaylistId, name, songIds: [], createdAt: serverTimestamp() };
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

  const togglePlayerSheet = () => {
    setIsPlayerSheetOpen(prev => !prev);
  }

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
        clearTask,
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
