export interface Song {
  id: string;
  title: string;
  artist: string;
  fileUrl: string;
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

export interface Post {
  id: string;
  userId: string;
  username: string; // Denormalized for easy display
  userImage: string | null; // Denormalized for easy display
  content: string;
  createdAt: string; // ISO 8601 string
}

    