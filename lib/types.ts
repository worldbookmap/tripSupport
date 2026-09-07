import type { Region } from './regions';
import type { Category } from './category';

export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  history: string;
  tourist_info: string;
  region: Region;
  category: Category;
  country: string;
  city: string;
  district: string;
  address: string;
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
  source_id: string | null;
  title: string;
  thumbnail_url: string | null;
  description: string;
  location_id: string | null;
  route_id: string | null;
  created_at: string;
  authors?: Author[];
}

export interface LocationDetail extends Location {
  books: Book[];
}

export interface BookRecord extends Book {
  authors: Author[];
  location: Pick<Location, 'id' | 'name' | 'country' | 'city'> | null;
  route: Pick<RouteRecord, 'id' | 'name'> | null;
}

export interface HistoricalEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  location_id: string | null;
  route_id: string | null;
  created_at: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteRecord {
  id: string;
  name: string;
  info: string;
  region: Region;
  start_lat: number;
  start_lng: number;
  start_name: string;
  end_lat: number;
  end_lng: number;
  end_name: string;
  path: LatLng[];
  created_at: string;
  updated_at: string;
}

export interface RouteDetail extends RouteRecord {
  books: Book[];
}

export interface MindmapNode {
  id: string;
  type: 'location' | 'book' | 'event' | 'author' | 'country' | 'city';
  label: string;
}

export interface MindmapEdge {
  id: string;
  source: string;
  target: string;
}
