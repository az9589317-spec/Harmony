
"use client";

import React, { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, Link } from 'lucide-react';
import { useUser } from '@/firebase';

export function UploadDialog() {
  const { addSong } = useMusicPlayer();
  const { user } = useUser();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileList | null>(null);
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('file');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: "You must be logged in to upload.",
      });
      return;
    }

    if (activeTab === 'file' && files) {
      for (const file of Array.from(files)) {
        addSong(file, user.uid);
      }
    } else if (activeTab === 'url' && url) {
      addSong(url, user.uid);
    } else {
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: activeTab === 'file' ? "Please choose music file(s) to upload." : "Please enter a valid URL.",
      });
      return;
    }
    
    // Close the dialog immediately
    resetAndClose();
  };

  const resetAndClose = () => {
    setFiles(null);
    setUrl('');
    setOpen(false);
  };

  const canSubmit = (activeTab === 'file' && !!files && files.length > 0) || (activeTab === 'url' && !!url);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 px-2.5">
          <Upload className="mr-2 h-4 w-4" />
          <span>Upload</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Your Music</DialogTitle>
          <DialogDescription>
            Choose audio files from your device or provide a direct URL. We'll classify its genre for you.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">
              <Upload className="mr-2 h-4 w-4" />
              Upload File(s)
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link className="mr-2 h-4 w-4" />
              From URL
            </TabsTrigger>
          </TabsList>
          <TabsContent value="file" className="pt-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="music-file">Music File(s)</Label>
              <Input id="music-file" type="file" accept="audio/*" onChange={handleFileChange} multiple />
            </div>
          </TabsContent>
          <TabsContent value="url" className="pt-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="music-url">Audio URL</Label>
              <Input id="music-url" type="url" placeholder="https://example.com/song.mp3" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              Upload & Classify
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
