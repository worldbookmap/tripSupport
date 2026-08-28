export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  history: string;
  tourist_info: string;
  created_at: string;
  updated_at: string;
}

export interface Author {
  id: string;
  name: string;
  bio: string;
  created_at: string;
}

export interface Book {
  id: string;
  google_books_id: string | null;
  title: string;
  thumbnail_url: string | null;
  description: string;
  location_id: string;
  created_at: string;
  authors?: Author[];
}

export interface LocationDetail extends Location {
  books: Book[];
}

export interface HistoricalEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  location_id: string | null;
  created_at: string;
}

export interface MindmapNode {
  id: string;
  type: 'location' | 'book' | 'event' | 'author';
  label: string;
}

export interface MindmapEdge {
  id: string;
  source: string;
  target: string;
}
