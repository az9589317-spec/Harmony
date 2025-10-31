
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
import { Loader2, Upload, Link } from 'lucide-react';
import { useUser } from '@/firebase';
import { Progress } from './ui/progress';
import type { UploadTask } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

export function UploadDialog() {
  const { addSong, uploadTasks, clearCompletedTasks } = useMusicPlayer();
  const { user } = useUser();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileList | null>(null);
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('file');

  const activeTasks = uploadTasks.filter(task => task.status === 'uploading' || task.status === 'processing');
  const isUploading = activeTasks.length > 0;

  useEffect(() => {
    // This effect can be used to show a summary toast when all uploads are done.
    // For now, individual toasts are handled in the context.
  }, [uploadTasks]);

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
  };

  const resetAndClose = () => {
    setFiles(null);
    setUrl('');
    clearCompletedTasks();
    setOpen(false);
  };

  const canSubmit = (activeTab === 'file' && !!files && files.length > 0) || (activeTab === 'url' && !!url);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        // Delay clearing to allow for closing animation
        setTimeout(() => {
          setFiles(null);
          setUrl('');
          clearCompletedTasks();
        }, 300);
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-2 h-4 w-4" />
          <span>Upload</span>
        </Button>
      </DialogTrigger>
      <DialogContent onInteractOutside={(e) => {
        if (isUploading) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle>Upload Your Music</DialogTitle>
          <DialogDescription>
            Choose audio files from your device or provide a direct URL. We'll classify its genre for you.
          </DialogDescription>
        </DialogHeader>

        {!isUploading && (
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
        )}

        {uploadTasks.length > 0 && (
          <ScrollArea className="max-h-64 mt-4 pr-4">
            <div className='space-y-4'>
              {uploadTasks.map(task => (
                <div key={task.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <p className="truncate text-muted-foreground max-w-[80%]">{task.fileName}</p>
                    <p className="font-medium shrink-0">
                      {task.status === 'processing' && 'Processing...'}
                      {task.status === 'uploading' && `${Math.round(task.progress)}%`}
                      {task.status === 'success' && 'Done!'}
                      {task.status === 'error' && 'Failed'}
                    </p>
                  </div>
                  <Progress
                    value={task.status === 'processing' || task.status === 'success' ? 100 : task.progress}
                    className={
                      task.status === 'processing' ? 'animate-pulse' :
                      task.status === 'error' ? '[&>div]:bg-destructive' : ''
                    }
                  />
                  {task.status === 'error' && <p className="text-xs text-destructive">{task.error}</p>}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {isUploading ? (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={resetAndClose}>
                {uploadTasks.some(t => t.status === 'success' || t.status === 'error') ? 'Close' : 'Cancel'}
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                Upload & Classify
              </Button>
            </>
          )}

        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
