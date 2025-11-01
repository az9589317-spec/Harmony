
'use client';

import { useState, useMemo } from 'react';
import type { Playlist, Song } from '@/lib/types';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlbumArt } from './AlbumArt';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Search } from 'lucide-react';

interface AddSongsDialogProps {
  playlist: Playlist;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AddSongsDialog({ playlist, isOpen, onOpenChange }: AddSongsDialogProps) {
  const { getPlaylistSongs, addSongToPlaylist } = useMusicPlayer();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());

  const librarySongs = useMemo(() => getPlaylistSongs('library'), [getPlaylistSongs]);
  const playlistSongIds = useMemo(() => new Set(playlist.songIds), [playlist.songIds]);

  const availableSongs = useMemo(() => {
    return librarySongs.filter(song => 
      (song.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
       song.artist.toLowerCase().includes(searchTerm.toLowerCase())) &&
      !playlistSongIds.has(song.id)
    );
  }, [librarySongs, searchTerm, playlistSongIds]);

  const handleSelectSong = (songId: string) => {
    setSelectedSongIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
      }
      return newSet;
    });
  };

  const handleAddSongs = () => {
    selectedSongIds.forEach(songId => {
      addSongToPlaylist(songId, playlist.id);
    });
    toast({
      title: `${selectedSongIds.size} song(s) added`,
      description: `Your songs have been added to "${playlist.name}".`,
    });
    setSelectedSongIds(new Set());
    onOpenChange(false);
  };
  
  // Reset state when dialog is closed
  const handleOpenChange = (open: boolean) => {
      if (!open) {
          setSearchTerm('');
          setSelectedSongIds(new Set());
      }
      onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add to: {playlist.name}</DialogTitle>
          <DialogDescription>
            Select songs from your library to add to this playlist.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search your library..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
            />
        </div>
        <ScrollArea className="flex-1 -mx-6">
            <div className="px-6 py-2 space-y-2">
                {availableSongs.length > 0 ? (
                    availableSongs.map(song => (
                        <Label
                            key={song.id}
                            htmlFor={song.id}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                        >
                            <Checkbox 
                                id={song.id}
                                checked={selectedSongIds.has(song.id)}
                                onCheckedChange={() => handleSelectSong(song.id)}
                            />
                            <AlbumArt src={song.albumArtUrl} alt={song.title} className="w-10 h-10" />
                            <div className="min-w-0">
                                <p className="font-medium truncate">{song.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                            </div>
                        </Label>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        <p>No songs available to add.</p>
                        <p className="text-xs">Either they are already in the playlist, or your library is empty.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddSongs} disabled={selectedSongIds.size === 0}>
            Add {selectedSongIds.size > 0 ? `(${selectedSongIds.size})` : ''} Songs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
