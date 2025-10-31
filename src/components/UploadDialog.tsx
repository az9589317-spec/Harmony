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
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { useUser } from '@/firebase';
import { Progress } from './ui/progress';
import type { UploadTask } from '@/lib/types';

export function UploadDialog() {
  const { addSong, uploadTasks } = useMusicPlayer();
  const { user } = useUser();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const currentTask = uploadTasks.find(task => task.id === currentTaskId);

  useEffect(() => {
    if (currentTask) {
      if (currentTask.status === 'success') {
        toast({
          title: "Upload Complete",
          description: `"${currentTask.fileName}" has been added to your library.`,
        });
        resetAndClose();
      } else if (currentTask.status === 'error') {
         toast({
            variant: "destructive",
            title: "Upload Error",
            description: currentTask.error || "An unknown error occurred.",
        });
        setCurrentTaskId(null); // Allow user to try again
      }
    }
  }, [currentTask, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
        toast({
            variant: "destructive",
            title: "Upload Error",
            description: "Please choose a music file to upload.",
        });
        return;
    }
    if (!user) {
        toast({
            variant: "destructive",
            title: "Upload Error",
            description: "You must be logged in to upload.",
        });
        return;
    }
    
    // addSong returns the taskId
    const taskId = addSong(file, user.uid);
    setCurrentTaskId(taskId);
  };

  const resetAndClose = () => {
    setFile(null);
    setCurrentTaskId(null);
    setOpen(false);
  };

  const isUploading = currentTask && (currentTask.status === 'uploading' || currentTask.status === 'processing');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isUploading) {
            setOpen(isOpen);
            if (!isOpen) {
                setFile(null);
                setCurrentTaskId(null);
            }
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
            Choose an audio file from your device. We'll automatically classify its genre for you.
          </DialogDescription>
        </DialogHeader>
        
        {!isUploading && (
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="music-file">Music File</Label>
                <Input id="music-file" type="file" accept="audio/*" onChange={handleFileChange} />
            </div>
        )}

        {currentTask && (
          <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-sm">
                <p className="truncate text-muted-foreground">{currentTask.fileName}</p>
                <p className="font-medium">
                  {currentTask.status === 'processing' ? 'Processing...' : `${Math.round(currentTask.progress)}%`}
                </p>
              </div>
              <Progress value={currentTask.status === 'processing' ? 100 : currentTask.progress} className={currentTask.status === 'processing' ? 'animate-pulse' : ''} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file || isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentTask?.status === 'processing' ? 'Processing...' : isUploading ? 'Uploading...' : 'Upload & Classify'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
