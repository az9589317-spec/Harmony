
"use client";

import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { AlbumArt } from './AlbumArt';
import { cn } from '@/lib/utils';


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
    isShuffled,
    toggleShuffle,
    repeatMode,
    toggleRepeatMode,
  } = useMusicPlayer();

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  }

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  return (
    <footer className="h-20 bg-card border-t shrink-0 p-2 sm:p-4 flex items-center justify-between gap-4 z-10 shadow-inner">
      <div 
        className="flex items-center gap-3 w-1/3 cursor-pointer"
        onClick={togglePlayerSheet}
      >
        {currentTrack ? (
          <>
            <AlbumArt src={currentTrack.albumArtUrl} alt={currentTrack.title} className="w-12 h-12 flex-shrink-0" />
            <div className="hidden sm:block overflow-hidden">
              <p className="font-semibold text-sm truncate">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                <Music className="w-6 h-6 text-muted-foreground"/>
             </div>
             <div className="hidden sm:block">
                <p className="font-semibold text-sm">No song</p>
                <p className="text-xs text-muted-foreground">Select a song</p>
             </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={toggleShuffle} disabled={!currentTrack} className={cn("w-10 h-10 rounded-full hidden sm:inline-flex", isShuffled && "text-accent")}>
            <Shuffle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={playPrevious} disabled={!currentTrack} className="w-10 h-10 rounded-full">
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button variant="default" size="icon" className="w-12 h-12 rounded-full" onClick={togglePlayPause} disabled={!currentTrack}>
            {isPlaying ? <Pause className="h-6 w-6" fill="currentColor"/> : <Play className="h-6 w-6" fill="currentColor"/>}
          </Button>
          <Button variant="ghost" size="icon" onClick={playNext} disabled={!currentTrack} className="w-10 h-10 rounded-full">
            <SkipForward className="h-5 w-5" />
          </Button>
           <Button variant="ghost" size="icon" onClick={toggleRepeatMode} disabled={!currentTrack} className={cn("w-10 h-10 rounded-full hidden sm:inline-flex", repeatMode !== 'none' && "text-accent")}>
            <RepeatIcon className="h-5 w-5" />
          </Button>
        </div>
        <div className="w-full hidden sm:flex items-center gap-2">
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
      
      <div className="hidden md:flex items-center gap-2 w-1/3 justify-end">
        <Button variant="ghost" size="icon" onClick={() => setVolume(volume > 0 ? 0 : 0.5)}>
            {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
        <Slider
            value={[volume]}
            max={1}
            step={0.05}
            onValueChange={handleVolumeChange}
            className="max-w-[120px]"
        />
      </div>
       <div className="w-1/3 flex justify-end md:hidden">
        {/* This div is to balance the flex layout on mobile, so the center controls are actually centered */}
      </div>
    </footer>
  );
}
