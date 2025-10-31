"use client";

import type { Song, Playlist } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

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
  addSong: (song: Song) => void;
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

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

const initialSongs: Song[] = [
    { id: '1', title: 'Midnight City', artist: 'M83', url: '', duration: 243, genre: 'Synth-pop', albumArtUrl: PlaceHolderImages[0].imageUrl },
    { id: '2', title: 'Bohemian Rhapsody', artist: 'Queen', url: '', duration: 355, genre: 'Rock', albumArtUrl: PlaceHolderImages[1].imageUrl },
    { id: '3', title: 'Take Five', artist: 'Dave Brubeck', url: '', duration: 324, genre: 'Jazz', albumArtUrl: PlaceHolderImages[2].imageUrl },
];


export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [playlists, setPlaylists] = useState<Playlist[]>([
      { id: 'library', name: 'Library', songIds: initialSongs.map(s => s.id) },
      { id: 'favorites', name: 'Favorites', songIds: [initialSongs[0].id] },
  ]);
  const [activePlaylistId, setActivePlaylistId] = useState('library');
  const [currentTrackIndexInPlaylist, setCurrentTrackIndexInPlaylist] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement>(null);

  const getPlaylistSongs = useCallback((playlistId: string): Song[] => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return [];
    return playlist.songIds.map(songId => songs.find(s => s.id === songId)).filter(Boolean) as Song[];
  }, [playlists, songs]);

  const activePlaylistSongs = getPlaylistSongs(activePlaylistId);
  const currentTrack = currentTrackIndexInPlaylist !== null ? activePlaylistSongs[currentTrackIndexInPlaylist] : null;

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

  const addSong = (song: Song) => {
    setSongs(prev => [...prev, song]);
    setPlaylists(prev => prev.map(p => p.id === 'library' ? { ...p, songIds: [...p.songIds, song.id] } : p));
  };
  
  const playTrack = (trackIndexInPlaylist: number, playlistId: string = activePlaylistId) => {
    if (playlistId !== activePlaylistId) {
      setActivePlaylistId(playlistId);
    }
    const targetPlaylistSongs = getPlaylistSongs(playlistId);
    const track = targetPlaylistSongs[trackIndexInPlaylist];

    if (track && audioRef.current) {
      if(track.url) audioRef.current.src = track.url;
      setCurrentTrackIndexInPlaylist(trackIndexInPlaylist);
      audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Playback failed", e));
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Playback failed", e));
    }
  };

  const playNext = useCallback(() => {
    if (currentTrackIndexInPlaylist === null) return;
    const nextIndex = (currentTrackIndexInPlaylist + 1) % activePlaylistSongs.length;
    playTrack(nextIndex);
  }, [currentTrackIndexInPlaylist, activePlaylistSongs.length]);

  const playPrevious = () => {
    if (currentTrackIndexInPlaylist === null) return;
    const prevIndex = (currentTrackIndexInPlaylist - 1 + activePlaylistSongs.length) % activePlaylistSongs.length;
    playTrack(prevIndex);
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
  
  const createPlaylist = (name: string) => {
      const newPlaylist: Playlist = { id: Date.now().toString(), name, songIds: [] };
      setPlaylists(prev => [...prev, newPlaylist]);
  };
  
  const addSongToPlaylist = (songId: string, playlistId: string) => {
      setPlaylists(prev => prev.map(p => {
          if (p.id === playlistId && !p.songIds.includes(songId)) {
              return { ...p, songIds: [...p.songIds, songId] };
          }
          return p;
      }));
  };

  return (
    <MusicPlayerContext.Provider value={{
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
      setActivePlaylistId
    }}>
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
