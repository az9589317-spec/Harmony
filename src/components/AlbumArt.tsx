import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Music } from 'lucide-react';

interface AlbumArtProps {
  src?: string;
  alt: string;
  className?: string;
}

export function AlbumArt({ src, alt, className }: AlbumArtProps) {
  return (
    <div className={cn('relative aspect-square overflow-hidden rounded-md bg-muted flex items-center justify-center', className)}>
      {src ? (
        <Image 
          src={src} 
          alt={alt} 
          fill={true}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover w-full h-full" 
        />
      ) : (
        <Music className="w-1/2 h-1/2 text-muted-foreground" />
      )}
    </div>
  );
}
