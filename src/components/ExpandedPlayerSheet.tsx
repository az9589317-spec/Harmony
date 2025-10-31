
'use client';

import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { AlbumArt } from './AlbumArt';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

function formatDuration(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function ExpandedPlayerSheet() {
  const {
    isPlayerSheetOpen,
    togglePlayerSheet,
    currentTrack,
    isPlaying,
    togglePlayPause,
    playNext,
    playPrevious,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
  } = useMusicPlayer();
  const isMobile = useIsMobile();


  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  if (!currentTrack) {
    // Return null or a placeholder if no track is active,
    // to prevent the sheet from opening with no content.
    return null;
  }

  return (
    <Sheet open={isPlayerSheetOpen} onOpenChange={togglePlayerSheet}>
      <SheetContent
        side="bottom"
        className="h-screen w-screen max-w-full bg-gradient-to-b from-primary/80 to-background flex flex-col p-4 sm:p-8"
      >
        {/* We don't use SheetHeader, Title, or Description to have full control over the layout */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 text-primary-foreground">
            <AlbumArt
                src={currentTrack.albumArtUrl}
                alt={currentTrack.title}
                className="w-64 h-64 sm:w-80 sm:h-80 shadow-2xl rounded-lg"
            />
            <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold">{currentTrack.title}</h2>
                <p className="text-lg sm:text-xl text-primary-foreground/80">{currentTrack.artist}</p>
            </div>

            <div className="w-full max-w-md space-y-4">
                 <div className="w-full space-y-1">
                    <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={1}
                        onValueChange={handleSeek}
                        disabled={!currentTrack}
                        className='[&>span:first-child]:h-1'
                    />
                    <div className="flex justify-between text-xs font-mono">
                        <span>{formatDuration(currentTime)}</span>
                        <span>{formatDuration(duration)}</span>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                    <Button variant="ghost" size="icon" onClick={playPrevious} className="h-14 w-14 hover:bg-white/20">
                        <SkipBack className="h-8 w-8" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-20 w-20 rounded-full bg-white/20 hover:bg-white/30" onClick={togglePlayPause}>
                        {isPlaying ? (
                        <Pause className="h-10 w-10" fill="currentColor" />
                        ) : (
                        <Play className="h-10 w-10" fill="currentColor" />
                        )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={playNext} className="h-14 w-14 hover:bg-white/20">
                        <SkipForward className="h-8 w-8" />
                    </Button>
                </div>
                
                {isMobile && (
                    <div className="flex items-center gap-2 pt-4">
                        <Button variant="ghost" size="icon" onClick={() => setVolume(volume > 0 ? 0 : 0.5)} className="hover:bg-white/20">
                            {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                        </Button>
                        <Slider
                            value={[volume]}
                            max={1}
                            step={0.05}
                            onValueChange={handleVolumeChange}
                            className='[&>span:first-child]:h-1'
                        />
                    </div>
                )}
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
