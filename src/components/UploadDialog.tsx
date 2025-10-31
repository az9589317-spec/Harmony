"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { classifyMusicGenre } from '@/ai/flows/ai-classify-uploaded-music';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function UploadDialog() {
  const { addSong } = useMusicPlayer();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        audio.src = URL.createObjectURL(file);
        audio.onloadedmetadata = () => {
            resolve(audio.duration);
            URL.revokeObjectURL(audio.src);
        };
    });
  }

  const handleSubmit = async () => {
    if (!file) {
        toast({
            variant: "destructive",
            title: "No file selected",
            description: "Please choose a music file to upload.",
        });
        return;
    }

    setIsLoading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const musicDataUri = reader.result as string;
        
        const [genreResponse, duration] = await Promise.all([
          classifyMusicGenre({ musicDataUri }),
          getAudioDuration(file)
        ]);

        const randomAlbumArt = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl;

        const newSong = {
          id: Date.now().toString(),
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: 'Unknown Artist',
          url: URL.createObjectURL(file),
          duration: duration,
          genre: genreResponse.genre || 'Unknown',
          albumArtUrl: randomAlbumArt
        };

        addSong(newSong);
        toast({
          title: "Song Uploaded!",
          description: `"${newSong.title}" was added to your library.`,
        });
        setFile(null);
        setIsLoading(false);
        setOpen(false);
      };
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Could not classify or add the song.',
      });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Music
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Your Music</DialogTitle>
          <DialogDescription>
            Choose an audio file from your device. We'll automatically classify its genre for you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="music-file">Music File</Label>
          <Input id="music-file" type="file" accept="audio/*" onChange={handleFileChange} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !file}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Uploading...' : 'Upload & Classify'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
