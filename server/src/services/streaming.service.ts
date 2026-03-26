import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { config } from '../config.js';
import { getDb } from '../db/connection.js';
import { rowToMedia, MEDIA_COLUMNS } from '../utils/db.js';
import type { MediaFile } from '../types/index.js';


// Track in-progress transcoding jobs
const activeTranscodes = new Map<number, Promise<void>>();

function getTranscodeDir(mediaId: number): string {
  const dir = path.join(config.cacheDir, 'transcoded', String(mediaId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getPlaylistPath(mediaId: number): string {
  return path.join(getTranscodeDir(mediaId), 'playlist.m3u8');
}

export function getSegmentPath(mediaId: number, segment: string): string {
  return path.join(getTranscodeDir(mediaId), segment);
}

export function isTranscoded(mediaId: number): boolean {
  return fs.existsSync(getPlaylistPath(mediaId));
}

export function isTranscoding(mediaId: number): boolean {
  return activeTranscodes.has(mediaId);
}

export async function startTranscode(media: MediaFile): Promise<void> {
  if (activeTranscodes.has(media.id)) {
    return activeTranscodes.get(media.id);
  }

  const outputDir = getTranscodeDir(media.id);
  const playlistPath = path.join(outputDir, 'playlist.m3u8');

  if (fs.existsSync(playlistPath)) return;

  const promise = new Promise<void>((resolve, reject) => {
    ffmpeg(media.file_path)
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
        '-f hls',
        '-hls_time 10',
        '-hls_list_size 0',
        '-hls_segment_filename', path.join(outputDir, 'segment%03d.ts'),
      ])
      .output(playlistPath)
      .on('end', () => {
        activeTranscodes.delete(media.id);
        resolve();
      })
      .on('error', (err) => {
        activeTranscodes.delete(media.id);
        reject(err);
      })
      .run();
  });

  activeTranscodes.set(media.id, promise);
  return promise;
}

export function getMediaById(mediaId: number): MediaFile | null {
  const db = getDb();
  const result = db.exec(
    `SELECT ${MEDIA_COLUMNS} FROM media_files WHERE id = $id`,
    { $id: mediaId },
  );
  if (!result.length || !result[0].values.length) return null;
  return rowToMedia(result[0].values[0]);
}

export function getAlbumPath(albumId: number): string | null {
  const db = getDb();
  const result = db.exec(
    `SELECT path FROM albums WHERE id = $id`,
    { $id: albumId },
  );
  if (!result.length || !result[0].values.length) return null;
  return result[0].values[0][0] as string;
}
