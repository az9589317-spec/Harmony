export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number;
  genre: string;
  albumArtUrl: string;
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
}
