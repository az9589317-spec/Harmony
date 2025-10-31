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

export function SongList({ songs, playlistId }: SongListProps) {
  const { playTrack, playlists, addSongToPlaylist, currentTrack } = useMusicPlayer();
  const { user } = useUser();
  const [songToEdit, setSongToEdit] = useState<Song | null>(null);

  const handleEdit = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    setSongToEdit(song);
  };

  if (songs.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
            <Music className="w-16 h-16 mb-4"/>
            <h2 className="text-xl font-semibold">No songs here</h2>
            <p className="mt-2">Upload some music to get started!</p>
        </div>
    )
  }
  
  return (
    <>
      <div className="p-2 md:p-6">
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
                  <div>{song.title}</div>
                  <div className="text-muted-foreground text-xs md:hidden">{song.artist}</div>
                </TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">{song.artist}</TableCell>
                <TableCell className="text-muted-foreground capitalize hidden lg:table-cell">{song.genre}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatDuration(song.duration)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()} className="px-0 md:px-4 w-10 md:w-12">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <button className="p-2 opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-full hover:bg-secondary">
                              <MoreHorizontal className="w-4 h-4"/>
                              <span className="sr-only">More options</span>
                          </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                            <DropdownMenuItem onClick={(e) => handleEdit(song, e)}>
                                <Pencil className="mr-2 h-4 w-4"/>
                                Edit Song
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
