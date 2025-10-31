'use client';

import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from './ui/button';
import { ListMusic, Music, Plus, Headphones } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { Input } from './ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface AppSidebarProps {
  onSelectPlaylist: (playlistId: string) => void;
}

export function AppSidebar({ onSelectPlaylist }: AppSidebarProps) {
  const { playlists, createPlaylist, activePlaylistId } = useMusicPlayer();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-background flex flex-col p-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <Headphones className="w-8 h-8 text-accent" />
        <h1 className="text-2xl font-bold text-foreground font-headline">Harmony Hub</h1>
      </div>

      <nav className="flex flex-col gap-2 mb-6">
        <Button
          variant={activePlaylistId === 'library' ? 'secondary' : 'ghost'}
          className="justify-start gap-3 px-3"
          onClick={() => onSelectPlaylist('library')}
        >
          <Music className="w-5 h-5" />
          <span>My Library</span>
        </Button>
      </nav>

      <div className="flex items-center justify-between mb-2 px-3">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">Playlists</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4" />
          <span className="sr-only">New Playlist</span>
        </Button>
      </div>

      <ScrollArea className="flex-1 -mx-4">
        <div className="px-4">
            {playlists
            .filter((p) => p.id !== 'library')
            .map((playlist) => (
                <Button
                key={playlist.id}
                variant={activePlaylistId === playlist.id ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-3 px-3 truncate"
                onClick={() => onSelectPlaylist(playlist.id)}
                >
                <ListMusic className="w-5 h-5 text-muted-foreground" />
                <span className="truncate">{playlist.name}</span>
                </Button>
            ))}
        </div>
      </ScrollArea>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Playlist name"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
          />
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreatePlaylist}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
