
"use client";

import { useState, useMemo } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { AppHeader } from '@/components/AppHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { SongList } from '@/components/SongList';
import { MusicPlayerControls } from '@/components/MusicPlayerControls';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider, Sidebar, SidebarInset } from './ui/sidebar';
import { ExpandedPlayerSheet } from './ExpandedPlayerSheet';
import { UploadProgressBar } from './UploadProgressBar';
import { Button } from './ui/button';
import { Plus, Check } from 'lucide-react';

export function HarmonyHubClient() {
  const { songs, playlists, getPlaylistSongs, activePlaylistId, setActivePlaylistId, addSongToPlaylist } = useMusicPlayer();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingSongs, setIsAddingSongs] = useState(false);

  const activePlaylist = useMemo(() => playlists.find(p => p.id === activePlaylistId), [playlists, activePlaylistId]);

  const handleAddSongClick = (songId: string) => {
    if (isAddingSongs && activePlaylistId !== 'library') {
      addSongToPlaylist(songId, activePlaylistId);
    }
  };

  const songsToDisplay = useMemo(() => {
    // If in "add songs" mode, always show the full library
    if (isAddingSongs) {
        let librarySongs = getPlaylistSongs('library');
         if (searchTerm) {
            return librarySongs.filter(song =>
                song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
                song.genre.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return librarySongs;
    }
    
    // Default behavior
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
  }, [activePlaylistId, getPlaylistSongs, searchTerm, songs, isAddingSongs]);
  
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleSelectPlaylist = (playlistId: string) => {
    setSearchTerm("");
    setIsAddingSongs(false); // Exit add mode when switching playlists
    setActivePlaylistId(playlistId);
  }

  const playlistName = useMemo(() => {
    if (isAddingSongs) {
        return `Add to "${activePlaylist?.name}"`;
    }
    if (searchTerm) {
      return `Search Results`;
    }
    return activePlaylist?.name || 'Music';
  }, [searchTerm, activePlaylist, isAddingSongs]);

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
            <UploadProgressBar />
            <ScrollArea className="flex-1">
              {activePlaylistId !== 'library' && !searchTerm && (
                <div className="p-4 md:p-6 pb-0">
                  {isAddingSongs ? (
                     <Button onClick={() => setIsAddingSongs(false)}>
                        <Check className="mr-2 h-4 w-4" />
                        Done Adding
                    </Button>
                  ) : (
                    <Button onClick={() => setIsAddingSongs(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Songs
                    </Button>
                  )}
                </div>
              )}
              <SongList 
                songs={songsToDisplay} 
                playlistId={activePlaylistId} 
                isAddingMode={isAddingSongs}
                onAddSong={handleAddSongClick}
              />
            </ScrollArea>
          </SidebarInset>
        </div>
        <MusicPlayerControls />
      </div>
      <ExpandedPlayerSheet />
    </SidebarProvider>
  );
}
