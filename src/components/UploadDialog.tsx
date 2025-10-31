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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { useUser } from '@/firebase';

export function UploadDialog() {
  const { addSong } = useMusicPlayer();
  const { user } = useUser();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file || !user) {
        toast({
            variant: "destructive",
            title: "Upload Error",
            description: !file ? "Please choose a music file to upload." : "You must be logged in to upload.",
        });
        return;
    }
    
    addSong(file);

    toast({
      title: "Upload Started",
      description: `"${file.name}" is now uploading in the background.`,
    });

    setFile(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-2 h-4 w-4" />
          <span>Upload</span>
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
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file}>
            Upload & Classify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
