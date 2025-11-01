
'use client';

import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from './ui/button';
import { ListMusic, Music, Plus, Headphones, Users, User as UserIcon } from 'lucide-react';
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
import { ScrollArea } from './ui/scroll-area';
import { useSidebar } from './ui/sidebar';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';

interface AppSidebarProps {
  onSelectPlaylist: (playlistId: string) => void;
}

export function AppSidebar({ onSelectPlaylist }: AppSidebarProps) {
  const { user } = useUser();
  const { playlists, createPlaylist, activePlaylistId } = useMusicPlayer();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  const handleSelect = (playlistId: string) => {
    onSelectPlaylist(playlistId);
    if(pathname !== '/') {
        router.push('/');
    }
    setOpenMobile(false); // Close sidebar on mobile after selection
  };
  
  const handleNav = (path: string) => {
      setOpenMobile(false);
      router.push(path);
  }

  const isMusicActive = pathname === '/' && activePlaylistId === 'library';

  return (
    <div className="flex flex-col h-full p-2 md:p-4">
      <div className="flex items-center gap-2 mb-4 px-2 pt-4 md:mb-8">
        <Headphones className="w-8 h-8 text-accent" />
        <h1 className="text-2xl font-bold text-foreground font-headline group-data-[collapsible=icon]:hidden">
          Harmony Hub
        </h1>
      </div>

      <nav className="flex flex-col gap-2 mb-4">
        <Button
            variant={isMusicActive ? 'secondary' : 'ghost'}
            className="justify-start gap-3 px-3 w-full"
            onClick={() => handleSelect('library')}
        >
            <ListMusic className="w-5 h-5" />
            <span className="group-data-[collapsible=icon]:hidden">All Songs</span>
        </Button>
        <Button
            variant={pathname === '/community' ? 'secondary' : 'ghost'}
            className="justify-start gap-3 px-3 w-full"
            onClick={() => handleNav('/community')}
        >
            <Users className="w-5 h-5" />
            <span className="group-data-[collapsible=icon]:hidden">
              Community
            </span>
        </Button>
        {user && (
            <Button
                variant={pathname === '/profile' ? 'secondary' : 'ghost'}
                className="justify-start gap-3 px-3 w-full"
                onClick={() => handleNav('/profile')}
            >
                <UserIcon className="w-5 h-5" />
                <span className="group-data-[collapsible=icon]:hidden">
                My Profile
                </span>
            </Button>
        )}
      </nav>

      {pathname === '/' && (
        <>
          {user && (
            <>
              <div className="flex items-center justify-between mb-2 px-3">
                <h2 className="text-sm font-semibold text-muted-foreground tracking-wider uppercase group-data-[collapsible=icon]:hidden">
                  Playlists
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="w-4 h-4" />
                  <span className="sr-only">New Playlist</span>
                </Button>
              </div>

              <ScrollArea className="flex-1 -mx-2">
                <div className="px-2">
                  {playlists
                    .filter((p) => p.id !== 'library')
                    .map((playlist) => (
                      <Button
                        key={playlist.id}
                        variant={
                          activePlaylistId === playlist.id ? 'secondary' : 'ghost'
                        }
                        className="w-full justify-start gap-3 px-3 truncate"
                        onClick={() => handleSelect(playlist.id)}
                      >
                        <Music className="w-5 h-5 text-muted-foreground" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">
                          {playlist.name}
                        </span>
                      </Button>
                    ))}
                </div>
              </ScrollArea>
            </>
          )}
        </>
      )}

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
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleCreatePlaylist}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
