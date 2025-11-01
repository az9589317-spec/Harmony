
"use client";

import type { Song } from '@/lib/types';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlbumArt } from './AlbumArt';
import { Clock, MoreHorizontal, Music, Plus, Play, Pencil } from 'lucide-react';
import { EditSongDialog } from './EditSongDialog';
import { useUser } from '@/firebase';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface SongListProps {
  songs: Song[];
  playlistId: string;
}

function formatDuration(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const SongItemMenu = ({ song, onEdit }: { song: Song, onEdit: (song: Song, e: React.MouseEvent) => void }) => {
    const { user } = useUser();
    const { playlists, addSongToPlaylist } = useMusicPlayer();
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="w-4 h-4"/>
                    <span className="sr-only">More options</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Plus className="mr-2 h-4 w-4"/>
                        Add to playlist
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        {playlists.filter(p => p.id !== 'library').map(p => (
                            <DropdownMenuItem key={p.id} onClick={() => addSongToPlaylist(song.id, p.id)}>
                                {p.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                {user && user.uid === song.userId && (
                  <DropdownMenuItem onClick={(e) => onEdit(song, e)}>
                      <Pencil className="mr-2 h-4 w-4"/>
                      Edit Song
                  </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};


export function SongList({ songs, playlistId }: SongListProps) {
  const { playTrack, currentTrack, setActivePlaylistId } = useMusicPlayer();
  const [songToEdit, setSongToEdit] = useState<Song | null>(null);
  const isMobile = useIsMobile();
  const [mobileLimit, setMobileLimit] = useState(15);

  const handleEdit = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    setSongToEdit(song);
  };

  const handleAddSongsClick = () => {
    setActivePlaylistId('library');
  };

  if (songs.length === 0) {
    if (playlistId === 'library') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
            <Music className="w-16 h-16 mb-4"/>
            <h2 className="text-xl font-semibold">No songs here</h2>
            <p className="mt-2">Upload some music to get started!</p>
        </div>
      );
    }
    
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
            <Music className="w-16 h-16 mb-4"/>
            <h2 className="text-xl font-semibold">This playlist is empty</h2>
            <p className="mt-2 mb-4">Add songs from your library to this playlist.</p>
            <Button onClick={handleAddSongsClick}>
              <Plus className="mr-2 h-4 w-4" />
              Add Songs
            </Button>
        </div>
    );
  }

  const renderMobileList = () => {
    const songsToShow = songs.slice(0, mobileLimit);
    const hasMore = songs.length > mobileLimit;

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
        {songsToShow.map((song, index) => (
             <Card 
                key={song.id} 
                data-state={currentTrack?.id === song.id ? 'selected' : undefined}
                className="cursor-pointer transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted overflow-hidden group"
            >
                <CardContent className="p-0 flex flex-col relative">
                    <div onClick={() => playTrack(index, playlistId)} className="relative aspect-square">
                        <AlbumArt src={song.albumArtUrl} alt={song.title} className="w-full h-full rounded-b-none" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-8 h-8 text-white" fill="white"/>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0">
                       <SongItemMenu song={song} onEdit={handleEdit} />
                    </div>
                    <div className="p-2 min-w-0">
                        <p className="font-medium truncate text-sm">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                </CardContent>
            </Card>
        ))}
        {hasMore && (
          <div className="pt-4 text-center col-span-2 sm:col-span-3">
            <Button variant="outline" onClick={() => setMobileLimit(prev => prev + 15)}>
              Show More
            </Button>
          </div>
        )}
      </div>
    );
  };
  
  const renderDesktopTable = () => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 px-2 md:px-4"></TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="hidden md:table-cell">Artist</TableHead>
            <TableHead className="hidden lg:table-cell">Genre</TableHead>
            <TableHead className="text-right w-24">
              <Clock className="inline-block w-4 h-4" />
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {songs.map((song, index) => (
            <TableRow 
                key={song.id} 
                className="group cursor-pointer"
                data-state={currentTrack?.id === song.id ? 'selected' : undefined}
                onClick={() => playTrack(index, playlistId)}
            >
              <TableCell className="px-2 md:px-4">
                <div className="relative">
                  <AlbumArt src={song.albumArtUrl} alt={song.title} className="w-10 h-10" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-white" fill="white"/>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-medium">
                <div className="min-w-0">
                    <p className="truncate">{song.title}</p>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground hidden md:table-cell">{song.artist}</TableCell>
              <TableCell className="text-muted-foreground capitalize hidden lg:table-cell">{song.genre}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatDuration(song.duration)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()} className="px-0 md:px-4 w-10 md:w-12">
                  <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <SongItemMenu song={song} onEdit={handleEdit} />
                  </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
  );

  return (
    <>
      <div className="p-0 sm:p-4 md:p-6">
        {isMobile ? renderMobileList() : renderDesktopTable()}
      </div>
      {songToEdit && (
        <EditSongDialog
          song={songToEdit}
          isOpen={!!songToEdit}
          onOpenChange={(isOpen) => !isOpen && setSongToEdit(null)}
        />
      )}
    </>
  );
}
