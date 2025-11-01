
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
import { useRouter } from 'next/navigation';

export function HarmonyHubClient() {
  const { getPlaylistSongs, activePlaylistId, setActivePlaylistId, isLoading, playlists, songs } = useMusicPlayer();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddSongsDialogOpen, setIsAddSongsDialogOpen] = useState(false);
  const router = useRouter();


  const activePlaylist = useMemo(() => {
      return playlists.find(p => p.id === activePlaylistId)
  }, [activePlaylistId, playlists]);

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
  };

  const handleSelectPlaylist = (playlistId: string) => {
    setSearchTerm("");
    setActivePlaylistId(playlistId);
    router.push('/');
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
          <SidebarInset className="relative flex flex-col overflow-hidden !m-0 !rounded-none !shadow-none bg-card">
            <AppHeader onSearchChange={handleSearchChange} onGoHome={() => handleSelectPlaylist('library')} />
            <UploadProgressBar />
            <div className="flex-shrink-0">
                {playlistName && !isLoading && (
                    <div className="flex justify-between items-center px-4 pt-4 md:px-6 bg-transparent">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
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
            </div>
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
