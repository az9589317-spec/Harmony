"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { UploadDialog } from './UploadDialog';

interface AppHeaderProps {
  playlistName: string;
  onSearchChange: (term: string) => void;
}

export function AppHeader({ playlistName, onSearchChange }: AppHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 px-6 shrink-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{playlistName}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search songs, artists, genres..."
            className="pl-9"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <UploadDialog />
      </div>
    </header>
  );
}
