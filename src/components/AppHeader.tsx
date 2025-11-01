
"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, LogOut, PanelLeft, Headphones, User as UserIcon } from 'lucide-react';
import { UploadDialog } from './UploadDialog';
import { useUser, useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useSidebar } from './ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';


interface AppHeaderProps {
  onSearchChange: (term: string) => void;
}

export function AppHeader({ onSearchChange }: AppHeaderProps) {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
  }

  return (
    <header className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 shrink-0 border-b">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
        >
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
        
        <div className="flex items-center gap-2">
             <div className="flex items-center gap-2 md:hidden">
                <Headphones className="w-6 h-6 text-accent" />
                 <h1 className="text-lg sm:text-xl font-bold tracking-tight font-headline">
                    Harmony Hub
                 </h1>
            </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
        <div className="relative w-full max-w-sm hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search songs, artists..."
              className="pl-9"
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

        {isMobile && isSearchVisible && (
           <div className="absolute top-0 left-0 right-0 p-2 bg-card border-b z-10 h-16 flex items-center">
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Search..."
                className="pl-9 w-full bg-background"
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
                onBlur={() => setIsSearchVisible(false)}
                />
            </div>
           </div>
        )}

        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSearch}>
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
        </Button>

        {user && <UploadDialog />}
        
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                  <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
               <DropdownMenuItem onClick={() => router.push('/profile')}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
