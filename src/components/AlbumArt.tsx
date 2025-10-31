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
        <Image src={src} alt={alt} width={80} height={80} className="object-cover w-full h-full" />
      ) : (
        <Music className="w-1/2 h-1/2 text-muted-foreground" />
      )}
    </div>
  );
}
