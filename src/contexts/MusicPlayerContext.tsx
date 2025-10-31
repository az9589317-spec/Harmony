'use client';

import type { Song, Playlist } from '@/lib/types';
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
import { collection, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface MusicPlayerContextType {
  songs: Song[];
  playlists: Playlist[];
  currentTrackIndex: number | null;
  isPlaying: boolean;
  currentTrack: Song | null;
  currentTime: number;
  duration: number;
  volume: number;
  activePlaylistId: string;
  addSong: (song: Omit<Song, 'id' | 'url' | 'userId'>, file: File) => Promise<void>;
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
  const storage = getStorage();

  const songsRef = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'songs') : null),
    [firestore, user]
  );
  const { data: songsData, isLoading: songsLoading } = useCollection<Song>(songsRef);
  const songs = songsData || [];

  const playlistsRef = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'playlists') : null),
    [firestore, user]
  );
  const { data: playlistsData, isLoading: playlistsLoading } =
    useCollection<Playlist>(playlistsRef);

  const [activePlaylistId, setActivePlaylistId] = useState('library');
  const [currentTrackIndexInPlaylist, setCurrentTrackIndexInPlaylist] =
    useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement>(null);

  const playlists: Playlist[] = useMemo(() => {
    const userPlaylists = playlistsData || [];
    const libraryPlaylist: Playlist = {
      id: 'library',
      name: 'My Library',
      songIds: (songs || []).map((s) => s.id),
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
  }, [currentTrack]);

  const addSong = async (
    song: Omit<Song, 'id'| 'url' | 'userId'>, file: File
  ) => {
    if (!user) return;
    const songId = doc(collection(firestore, 'temp')).id;
    
    // Upload file to Firebase Storage
    const storageRef = ref(storage, `users/${user.uid}/songs/${songId}_${file.name}`);
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    const songRef = doc(firestore, 'users', user.uid, 'songs', songId);
    const newSong: Song = {
      ...song,
      id: songId,
      userId: user.uid,
      url: downloadURL,
      albumArtUrl:
        song.albumArtUrl ||
        PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)]
          .imageUrl,
    };
    await setDoc(songRef, newSong);
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
        audioRef.current.crossOrigin = "anonymous";
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

  const playNext = useCallback(() => {
    if (currentTrackIndexInPlaylist === null) return;
    const nextIndex = (currentTrackIndexInPlaylist + 1) % activePlaylistSongs.length;
    playTrack(nextIndex, activePlaylistId);
  }, [currentTrackIndexInPlaylist, activePlaylistSongs.length, activePlaylistId, playTrack]);

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
    const playlistId = doc(collection(firestore, 'temp')).id;
    const playlistRef = doc(firestore, 'users', user.uid, 'playlists', playlistId);
    const newPlaylist: Playlist = { id: playlistId, name, songIds: [] };
    await setDoc(playlistRef, newPlaylist);
  };

  const addSongToPlaylist = async (songId: string, playlistId: string) => {
    if (!user || playlistId === 'library') return;
    const playlist = playlists.find((p) => p.id === playlistId);
    if (playlist && !playlist.songIds.includes(songId)) {
      const playlistRef = doc(
        firestore,
        'users',
        user.uid,
        'playlists',
        playlistId
      );
      await setDoc(
        playlistRef,
        { songIds: [...playlist.songIds, songId] },
        { merge: true }
      );
    }
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        songs,
        playlists,
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
