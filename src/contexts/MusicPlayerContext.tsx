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
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { classifyMusicGenre } from '@/ai/flows/ai-classify-uploaded-music';
import ImageKit from 'imagekit-javascript';

// SDK initialization
const imagekit = new ImageKit({
  publicKey: 'public_1Z4y6xViWvq28fxsG8fPbD4BZGY=',
  urlEndpoint: 'https://ik.imagekit.io/c9okxuh0pu',
});

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
  addSong: (file: File) => void;
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

  const songs = useMemo(() => songsData || [], [songsData]);

  const playlists: Playlist[] = useMemo(() => {
    const userPlaylists = playlistsData || [];
    const libraryPlaylist: Playlist = {
      id: 'library',
      name: 'My Library',
      songIds: songs.map((s) => s.id),
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
  }, [currentTrack]); // Dependency on currentTrack is correct here

  const playNext = useCallback(() => {
    if (currentTrackIndexInPlaylist === null) return;
    const nextIndex =
      (currentTrackIndexInPlaylist + 1) % activePlaylistSongs.length;
    playTrack(nextIndex, activePlaylistId);
  }, [currentTrackIndexInPlaylist, activePlaylistSongs.length, activePlaylistId]);


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

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      };
      audio.onerror = () => {
        resolve(0); // Default to 0 if duration can't be read
        URL.revokeObjectURL(audio.src);
      };
    });
  };

  const addSong = async (file: File) => {
    if (!user) return;

    const taskId = uuidv4();
    const newTask: UploadTask = {
      id: taskId,
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    };
    setUploadTasks((prev) => [newTask, ...prev]);

    try {
      // 1. Get Authentication Parameters from a backend
      // WARNING: This is an insecure, temporary solution for demonstration.
      // In a real app, you must create your own secure backend endpoint that uses your private key.
      const getAuthenticationParameters = async () => {
        const response = await fetch(
          'https://imagekit-auth-server-fly.dev/api/imagekit/auth'
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch auth params: ${errorText}`);
        }
        return response.json();
      };

      const authParams = await getAuthenticationParameters();

      // 2. Upload to ImageKit
      const uploadResponse = await imagekit.upload({
        file: file,
        fileName: file.name,
        ...authParams,
        useUniqueFileName: true,
        folder: `/users/${user.uid}/songs/`,
        onUploadProgress: (progress) => {
          updateTaskProgress(taskId, { progress: progress.percent });
        }
      });
      
      updateTaskProgress(taskId, { progress: 100, status: 'processing' });
      
      const downloadURL = uploadResponse.url;

      // 3. Classify Genre and Get Duration
      const [genreResponse, duration] = await Promise.all([
        classifyMusicGenre({ musicDataUri: await fileToDataUri(file) }),
        getAudioDuration(file),
      ]);

      const randomAlbumArt =
        PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)]
          .imageUrl;

      // 4. Save Song to Firestore
      const newSong: Song = {
        id: uploadResponse.fileId,
        userId: user.uid,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist',
        url: downloadURL,
        duration: duration,
        genre: genreResponse.genre || 'Unknown',
        albumArtUrl: randomAlbumArt,
      };

      const songRef = doc(firestore, 'users', user.uid, 'songs', newSong.id);
      await setDoc(songRef, newSong);

      updateTaskProgress(taskId, { status: 'success' });
      
      // 5. Remove from progress list after a delay
      setTimeout(() => {
        setUploadTasks((prev) => prev.filter((t) => t.id !== taskId));
      }, 5000);

    } catch (error) {
      console.error('Upload failed:', error);
      updateTaskProgress(taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const fileToDataUri = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const playTrack = (
    trackIndexInPlaylist: number,
    playlistId: string = activePlaylistId
  ) => {
    if (playlistId !== activePlaylistId) {
      setActivePlaylistId(playlistId);
    }
    const targetPlaylistSongs = getPlaylistSongs(playlistId);
    const track = targetPlaylistSongs[trackIndexInPlaylist];

    if (track && audioRef.current) {
      if (track.url) {
        audioRef.current.src = track.url;
        audioRef.current.crossOrigin = 'anonymous'; // Important for hosted content
      }
      setCurrentTrackIndexInPlaylist(trackIndexInPlaylist);
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.error('Playback failed', e));
    }
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
    const newPlaylist: Playlist = { id: newPlaylistId, name, songIds: [] };
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
        addSong,
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

    