export interface Album {
  id: number;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
  sort_order: number;
  scan_status?: string;
  last_scan_at?: string | null;
  file_count?: number;
}

export interface MediaFile {
  id: number;
  album_id: number;
  file_path: string;
  relative_path: string;
  filename: string;
  file_type: 'image' | 'video';
  file_size: number;
  mime_type: string;
  created_at: string | null;
  modified_at: string;
  scanned_at: string;
  thumbnail_path: string | null;
  thumbnail_generated: number;
  is_favorite: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface HomeAlbum extends Album {
  media: MediaFile[];
  is_favorites?: boolean;
}

export interface BrowseResult {
  currentPath: string;
  parent: string | null;
  directories: DirectoryEntry[];
}

export interface DirectoryEntry {
  name: string;
  path: string;
  hasChildren: boolean;
}

export interface ScanStatus {
  status: string;
  last_scan_at: string | null;
  file_count: number;
  error_message: string | null;
}

export interface ThumbnailStatus {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  generating: boolean;
}
