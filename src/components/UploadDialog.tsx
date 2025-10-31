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
import { useUser } from '@/firebase';

export function UploadDialog() {
  const { addSong } = useMusicPlayer();
  const { user } = useUser();
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
        audio.onerror = () => {
            resolve(0); // Resolve with 0 if there's an error loading the audio
            URL.revokeObjectURL(audio.src);
        }
    });
  }

  const handleSubmit = async () => {
    if (!file || !user) {
        toast({
            variant: "destructive",
            title: "Upload Error",
            description: !file ? "Please choose a music file to upload." : "You must be logged in to upload.",
        });
        return;
    }

    setIsLoading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const musicDataUri = reader.result as string;
        
        try {
            const [genreResponse, duration] = await Promise.all([
                classifyMusicGenre({ musicDataUri }),
                getAudioDuration(file)
            ]);

            const randomAlbumArt = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl;

            const newSong = {
              title: file.name.replace(/\.[^/.]+$/, ""),
              artist: 'Unknown Artist',
              duration: duration,
              genre: genreResponse.genre || 'Unknown',
              albumArtUrl: randomAlbumArt,
              userId: user.uid, // Pass the user ID
            };

            await addSong(newSong, file);

            toast({
              title: "Song Uploaded!",
              description: `"${newSong.title}" was added to your library.`,
            });

            setFile(null);
            setOpen(false);
        } catch (error) {
            console.error("Error during song processing:", error);
            toast({
                variant: 'destructive',
                title: 'Processing Failed',
                description: 'Could not classify or save the song.',
            });
        } finally {
            setIsLoading(false);
        }
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast({
            variant: 'destructive',
            title: 'File Read Error',
            description: 'Could not read the selected file.',
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Outer error handler:",error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'An unexpected error occurred during upload.',
      });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload
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
