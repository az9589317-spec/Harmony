import { FieldValue, Timestamp } from "firebase/firestore";

export interface Song {
  id: string;
  title: string;
  artist: string;
  fileUrl: string;
  duration: number;
  genre: string;
  albumArtUrl: string;
  userId: string;
  createdAt: FieldValue;
}

export interface Playlist {
  id: string;
  name: string;
  userId: string;
  songIds: string[];
  createdAt: FieldValue;
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
  createdAt: Timestamp | FieldValue; // Firestore Timestamp on read, FieldValue on write
  imageUrl?: string; // Optional image URL
  likes: string[]; // Array of user IDs who liked the post
  commentCount: number;
}

export interface Comment {
    id: string;
    postId: string;
    userId: string;
    username: string;
    userImage: string | null;
    content: string;
    createdAt: Timestamp | FieldValue;
}
