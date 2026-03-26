import type { MediaFile } from '../types/index.js';

export const MEDIA_COLUMNS = 'id, album_id, file_path, relative_path, filename, file_type, file_size, mime_type, created_at, modified_at, scanned_at, thumbnail_path, thumbnail_generated';

export function rowToMedia(row: unknown[]): MediaFile {
  return {
    id: row[0] as number,
    album_id: row[1] as number,
    file_path: row[2] as string,
    relative_path: row[3] as string,
    filename: row[4] as string,
    file_type: row[5] as 'image' | 'video',
    file_size: row[6] as number,
    mime_type: row[7] as string,
    created_at: row[8] as string | null,
    modified_at: row[9] as string,
    scanned_at: row[10] as string,
    thumbnail_path: row[11] as string | null,
    thumbnail_generated: row[12] as number,
  };
}

export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}
