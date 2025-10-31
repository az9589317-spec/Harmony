
"use client";

import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music } from 'lucide-react';
import { AlbumArt } from './AlbumArt';

function formatDuration(seconds: number) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function MusicPlayerControls() {
  const {
    isPlaying,
    currentTrack,
    togglePlayPause,
    playNext,
    playPrevious,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    togglePlayerSheet,
  } = useMusicPlayer();

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  }

  return (
    <footer className="h-24 bg-card border-t shrink-0 p-2 sm:p-4 flex items-center justify-between gap-2 sm:gap-6 z-10 shadow-inner">
      <div 
        className="flex items-center gap-2 sm:gap-4 flex-1 sm:flex-none sm:w-64 cursor-pointer"
        onClick={togglePlayerSheet}
      >
        {currentTrack ? (
          <>
            <AlbumArt src={currentTrack.albumArtUrl} alt={currentTrack.title} className="w-10 h-10 sm:w-14 sm:h-14" />
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold text-sm truncate">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 sm:gap-4">
             <div className="w-10 h-10 sm:w-14 sm:h-14 bg-muted rounded-md flex items-center justify-center">
                <Music className="w-6 h-6 text-muted-foreground"/>
             </div>
             <div className="hidden sm:block">
                <p className="font-semibold text-sm">No song</p>
                <p className="text-xs text-muted-foreground">Select a song</p>
             </div>
          </div>
        )}
      </div>

      <div className="hidden flex-1 sm:flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={playPrevious} disabled={!currentTrack}>
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button variant="default" size="icon" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" onClick={togglePlayPause} disabled={!currentTrack}>
            {isPlaying ? <Pause className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor"/> : <Play className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor"/>}
          </Button>
          <Button variant="ghost" size="icon" onClick={playNext} disabled={!currentTrack}>
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>
        <div className="w-full flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10 text-right">{formatDuration(currentTime)}</span>
            <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                disabled={!currentTrack}
            />
            <span className="text-xs text-muted-foreground w-10">{formatDuration(duration)}</span>
        </div>
      </div>
      <div className="flex sm:hidden items-center gap-2">
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full" onClick={playPrevious} disabled={!currentTrack}>
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button variant="default" size="icon" className="w-10 h-10 rounded-full" onClick={togglePlayPause} disabled={!currentTrack}>
            {isPlaying ? <Pause className="h-5 w-5" fill="currentColor"/> : <Play className="h-5 w-5" fill="currentColor"/>}
          </Button>
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full" onClick={playNext} disabled={!currentTrack}>
            <SkipForward className="h-5 w-5" />
          </Button>
      </div>

      <div className="hidden md:flex items-center gap-2 w-32 sm:w-48">
        <Button variant="ghost" size="icon" onClick={() => setVolume(volume > 0 ? 0 : 0.5)}>
            {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
        <Slider
            value={[volume]}
            max={1}
            step={0.05}
            onValueChange={handleVolumeChange}
        />
      </div>
    </footer>
  );
}
