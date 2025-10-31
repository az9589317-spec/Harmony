
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
} from '@/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { classifyMusicGenre } from '@/ai/flows/ai-classify-uploaded-music';
import { uploadMedia } from '@/app/actions/upload';
import { useToast } from '@/hooks/use-toast';


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

  const songsRef = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'songs') : null),
    [firestore, user]
  );
  const { data: songsData } = useCollection<Song>(songsRef);

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
    return [libraryPlaylist, ...userPlaylists];
  }, [playlistsData, songs]);

  const getPlaylistSongs = useCallback(
    (playlistId: string): Song[] => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist) return [];
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
    setUploadTasks([]);
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

        const [genreResponse, duration] = await Promise.all([
          sourceToDataUri(fileToProcess).then(dataUri => classifyMusicGenre({ musicDataUri: dataUri })).catch(() => ({ genre: 'Unknown' })),
          getAudioDuration(fileToProcess),
        ]);
  
        const randomAlbumArt =
          PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)]
            .imageUrl;
  
        const newSong: Song = {
          id: songId,
          userId: userId,
          title: fileName.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown Artist',
          fileUrl: downloadURL,
          duration: duration,
          genre: genreResponse.genre || 'Unknown',
          albumArtUrl: randomAlbumArt,
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
    await setDoc(playlistRef, newPlaylist);
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
    await updateDoc(playlistRef, {
      songIds: arrayUnion(songId),
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
