"use client";

import { useState, useMemo } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { AppHeader } from '@/components/AppHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { SongList } from '@/components/SongList';
import { MusicPlayerControls } from '@/components/MusicPlayerControls';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider, Sidebar, SidebarInset } from './ui/sidebar';

export function HarmonyHubClient() {
  const { songs, playlists, getPlaylistSongs, activePlaylistId, setActivePlaylistId } = useMusicPlayer();
  const [searchTerm, setSearchTerm] = useState("");

  const activePlaylist = useMemo(() => playlists.find(p => p.id === activePlaylistId), [playlists, activePlaylistId]);

  const songsToDisplay = useMemo(() => {
    let currentSongs = getPlaylistSongs(activePlaylistId);

    if (searchTerm) {
      // When searching, search across all songs in the library
      const librarySongs = getPlaylistSongs('library');
      return librarySongs.filter(song =>
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.genre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return currentSongs;
  }, [activePlaylistId, getPlaylistSongs, searchTerm, songs]);
  
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleSelectPlaylist = (playlistId: string) => {
    setSearchTerm("");
    setActivePlaylistId(playlistId);
  }

  const playlistName = useMemo(() => {
    if (searchTerm) {
      return `Search Results`;
    }
    return activePlaylist?.name || 'Music';
  }, [searchTerm, activePlaylist]);

  return (
    <SidebarProvider>
      <div className="h-screen w-full flex flex-col bg-card overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar>
            <AppSidebar onSelectPlaylist={handleSelectPlaylist} />
          </Sidebar>
          <SidebarInset className="flex flex-col overflow-hidden !m-0 !rounded-none !shadow-none">
            <AppHeader 
              playlistName={playlistName}
              onSearchChange={handleSearchChange}
            />
            <ScrollArea className="flex-1">
              <SongList songs={songsToDisplay} playlistId={activePlaylistId} />
            </ScrollArea>
          </SidebarInset>
        </div>
        <MusicPlayerControls />
      </div>
    </SidebarProvider>
  );
}
