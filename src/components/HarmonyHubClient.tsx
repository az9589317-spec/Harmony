
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
import { Plus } from 'lucide-react';
import { AddSongsDialog } from './AddSongsDialog';

export function HarmonyHubClient() {
  const { songs, playlists, getPlaylistSongs, activePlaylistId, setActivePlaylistId } = useMusicPlayer();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddSongsDialogOpen, setIsAddSongsDialogOpen] = useState(false);

  const activePlaylist = useMemo(() => playlists.find(p => p.id === activePlaylistId), [playlists, activePlaylistId]);

  const songsToDisplay = useMemo(() => {
    let currentSongs = getPlaylistSongs(activePlaylistId);

    if (searchTerm) {
      const librarySongs = getPlaylistSongs('library');
      return librarySongs.filter(song =>
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.genre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return currentSongs;
  }, [activePlaylistId, getPlaylistSongs, searchTerm]);
  
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
    if (activePlaylistId === 'library') {
      return "All Songs";
    }
    return activePlaylist?.name || 'Music';
  }, [searchTerm, activePlaylist, activePlaylistId]);

  return (
    <SidebarProvider>
      <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar>
            <AppSidebar onSelectPlaylist={handleSelectPlaylist} />
          </Sidebar>
          <SidebarInset className="relative flex flex-col overflow-hidden !m-0 !rounded-none !shadow-none bg-transparent">
            <AppHeader onSearchChange={handleSearchChange} />
            <UploadProgressBar />
            {playlistName && (
                <div className="flex justify-between items-center px-4 pt-6 md:px-6">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {playlistName}
                </h1>
                {activePlaylistId !== 'library' && !searchTerm && (
                    <Button 
                        variant="ghost"
                        size="icon" 
                        onClick={() => setIsAddSongsDialogOpen(true)}
                    >
                        <Plus className="h-6 w-6" />
                        <span className="sr-only">Add Songs</span>
                    </Button>
                )}
                </div>
            )}
            <ScrollArea className="flex-1">
              <SongList 
                songs={songsToDisplay} 
                playlistId={activePlaylistId} 
              />
            </ScrollArea>
          </SidebarInset>
        </div>
        <MusicPlayerControls />
      </div>
      <ExpandedPlayerSheet />
      {activePlaylist && (
        <AddSongsDialog 
            isOpen={isAddSongsDialogOpen}
            onOpenChange={setIsAddSongsDialogOpen}
            playlist={activePlaylist}
        />
      )}
    </SidebarProvider>
  );
}
