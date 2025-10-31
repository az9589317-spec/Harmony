'use client';

import { useState, useEffect, useRef } from 'react';
import type { Song } from '@/lib/types';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useToast } from '@/hooks/use-toast';
import { uploadMedia } from '@/app/actions/upload';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UploadCloud, X } from 'lucide-react';
import Image from 'next/image';
import { useForm, SubmitHandler } from 'react-hook-form';

type FormValues = {
  title: string;
  artist: string;
  genre: string;
  albumArt?: FileList;
};

interface EditSongDialogProps {
  song: Song;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function EditSongDialog({ song, isOpen, onOpenChange }: EditSongDialogProps) {
  const { updateSong } = useMusicPlayer();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(song.albumArtUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      title: song.title,
      artist: song.artist,
      genre: song.genre,
    },
  });

  useEffect(() => {
    reset({
      title: song.title,
      artist: song.artist,
      genre: song.genre,
    });
    setImagePreview(song.albumArtUrl);
  }, [song, reset]);
  
  const albumArtFile = watch('albumArt');

  useEffect(() => {
    if (albumArtFile && albumArtFile.length > 0) {
      const file = albumArtFile[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [albumArtFile]);


  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      let newAlbumArtUrl: string | undefined = undefined;

      if (data.albumArt && data.albumArt.length > 0) {
        const file = data.albumArt[0];
        const formData = new FormData();
        formData.append('file', file);
        const result = await uploadMedia(formData, 'image');
        if (!result.success) {
          throw new Error(result.error || 'Album art upload failed');
        }
        newAlbumArtUrl = result.url;
      }

      const updatedData: Partial<Song> = {
        title: data.title,
        artist: data.artist,
        genre: data.genre,
        ...(newAlbumArtUrl && { albumArtUrl: newAlbumArtUrl }),
      };
      
      await updateSong(song.id, updatedData);

      toast({
        title: 'Song Updated',
        description: `"${data.title}" has been updated successfully.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to update song:", error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(song.albumArtUrl);
    setValue('albumArt', undefined);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Song</DialogTitle>
          <DialogDescription>
            Make changes to the song details. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 py-4">
            <div className='flex items-start gap-4'>
                <div className="relative w-24 h-24 flex-shrink-0">
                    {imagePreview ? (
                        <>
                        <Image src={imagePreview} alt="Album art" fill className="rounded-md object-cover" />
                        {imagePreview !== song.albumArtUrl && (
                             <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                onClick={handleRemoveImage}
                                >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                       </>
                    ) : (
                        <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                            <UploadCloud className="w-8 h-8 text-muted-foreground"/>
                        </div>
                    )}
                </div>
                 <div className="grid gap-1.5 flex-1">
                    <Label htmlFor="albumArt">Album Art</Label>
                    <Input id="albumArt" type="file" accept="image/*" className="text-xs" {...register('albumArt')} ref={fileInputRef} />
                    <p className="text-xs text-muted-foreground">Upload a new poster image.</p>
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register('title', { required: true })} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="artist">Artist</Label>
                <Input id="artist" {...register('artist', { required: true })} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="genre">Genre</Label>
                <Input id="genre" {...register('genre', { required: true })} />
            </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
