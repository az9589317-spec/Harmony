"use client";

import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
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
  } = useMusicPlayer();

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  }

  return (
    <footer className="h-24 bg-card border-t shrink-0 p-4 flex items-center gap-6 z-10 shadow-lg">
      <div className="flex items-center gap-4 w-64">
        {currentTrack ? (
          <>
            <AlbumArt src={currentTrack.albumArtUrl} alt={currentTrack.title} className="w-14 h-14" />
            <div>
              <p className="font-semibold text-sm truncate">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-muted rounded-md"></div>
             <div>
                <p className="font-semibold text-sm">No song selected</p>
                <p className="text-xs text-muted-foreground">Select a song to play</p>
             </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={playPrevious} disabled={!currentTrack}>
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button variant="default" size="icon" className="w-12 h-12 rounded-full" onClick={togglePlayPause} disabled={!currentTrack}>
            {isPlaying ? <Pause className="h-6 w-6" fill="currentColor"/> : <Play className="h-6 w-6" fill="currentColor"/>}
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

      <div className="flex items-center gap-2 w-48">
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
