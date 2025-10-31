"use client";

import { useState, useMemo } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { AppHeader } from '@/components/AppHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { SongList } from '@/components/SongList';
import { MusicPlayerControls } from '@/components/MusicPlayerControls';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from './ui/separator';

export function HarmonyHubClient() {
  const { songs, playlists, getPlaylistSongs, activePlaylistId, setActivePlaylistId } = useMusicPlayer();
  const [searchTerm, setSearchTerm] = useState("");

  const activePlaylist = useMemo(() => playlists.find(p => p.id === activePlaylistId), [playlists, activePlaylistId]);

  const songsToDisplay = useMemo(() => {
    let currentSongs = getPlaylistSongs(activePlaylistId);

    if (searchTerm) {
      return songs.filter(song =>
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.genre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return currentSongs;
  }, [activePlaylistId, getPlaylistSongs, searchTerm, songs]);
  
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (term) {
        // Switch to a virtual 'search' view if user starts typing
        // This is a UI-only switch, context's active playlist for playback remains
    } else {
        // Revert to library view when search is cleared
        if (activePlaylistId !== 'library' && !playlists.find(p => p.id === activePlaylistId)) {
             setActivePlaylistId('library');
        }
    }
  };

  const handleSelectPlaylist = (playlistId: string) => {
    setSearchTerm("");
    setActivePlaylistId(playlistId);
  }

  const playlistName = searchTerm ? `Search results for "${searchTerm}"` : activePlaylist?.name || 'Music';

  return (
    <div className="h-screen w-full flex flex-col bg-card overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar onSelectPlaylist={handleSelectPlaylist} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <AppHeader 
            playlistName={playlistName}
            onSearchChange={handleSearchChange}
          />
          <Separator />
          <ScrollArea className="flex-1">
            <SongList songs={songsToDisplay} playlistId={activePlaylistId} />
          </ScrollArea>
        </main>
      </div>
      <MusicPlayerControls />
    </div>
  );
}
