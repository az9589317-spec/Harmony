export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number;
  genre: string;
  albumArtUrl: string;
  userId: string;
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
}

export interface UploadTask {
  id: string;
  fileName: string;
  progress: number; // 0 to 100
  status: 'uploading' | 'processing' | 'success' | 'error';
  error?: string;
}

    