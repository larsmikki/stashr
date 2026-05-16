import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';
import { rowToMedia, MEDIA_COLUMNS } from '../utils/db.js';
import type { MediaFile } from '../types/index.js';

let ffmpegAvailable: boolean | null = null;

export function checkFfmpeg(): Promise<boolean> {
  if (ffmpegAvailable !== null) return Promise.resolve(ffmpegAvailable);
  return new Promise((resolve) => {
    execFile('ffprobe', ['-version'], (err) => {
      ffmpegAvailable = !err;
      if (!ffmpegAvailable) {
        console.warn('ffmpeg/ffprobe not found — video thumbnails will be unavailable. Install ffmpeg to enable them.');
      }
      resolve(ffmpegAvailable);
    });
  });
}

function getThumbDir(albumId: number): string {
  const dir = path.join(config.cacheDir, 'thumbnails', String(albumId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getThumbPath(albumId: number, mediaId: number): string {
  return path.join(getThumbDir(albumId), `${mediaId}.jpg`);
}

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

async function generateImageThumbnail(inputPath: string, outputPath: string): Promise<void> {
  await sharp(inputPath)
    .resize({ width: config.thumbnailWidth, withoutEnlargement: true })
    .jpeg({ quality: config.thumbnailQuality })
    .toFile(outputPath);
}

function generateVideoThumbnail(inputPath: string, outputPath: string, duration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const seekTime = Math.max(0, duration * 0.25);
    ffmpeg(inputPath)
      .seekInput(seekTime)
      .frames(1)
      .size(`${config.thumbnailWidth}x?`)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function generateThumbnail(media: MediaFile): Promise<string | null> {
  const outputPath = getThumbPath(media.album_id, media.id);
  const db = getDb();

  try {
    if (media.file_type === 'image') {
      await generateImageThumbnail(media.file_path, outputPath);
    } else {
      // Check ffmpeg availability for video thumbnails
      const hasFfmpeg = await checkFfmpeg();
      if (!hasFfmpeg) {
        // Don't mark as failed (2) — leave as pending (0) so it retries when ffmpeg is available
        return null;
      }
      const duration = await getVideoDuration(media.file_path);
      await generateVideoThumbnail(media.file_path, outputPath, duration);
    }

    db.run(
      `UPDATE media_files SET thumbnail_generated = 1, thumbnail_path = $path WHERE id = $id`,
      { $path: outputPath, $id: media.id },
    );

    return outputPath;
  } catch (err) {
    console.error(`Thumbnail generation failed for ${media.file_path}:`, err);
    db.run(
      `UPDATE media_files SET thumbnail_generated = 2 WHERE id = $id`,
      { $id: media.id },
    );
    return null;
  }
}

export async function generatePendingThumbnails(albumId: number): Promise<void> {
  const db = getDb();
  const result = db.exec(
    `SELECT ${MEDIA_COLUMNS}
     FROM media_files WHERE album_id = $albumId AND thumbnail_generated = 0 LIMIT 500`,
    { $albumId: albumId },
  );

  if (!result.length) return;

  const pending = result[0].values.map(rowToMedia);

  // Process with concurrency limit
  const concurrency = config.thumbnailConcurrency;
  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    await Promise.allSettled(batch.map((m: MediaFile) => generateThumbnail(m)));
  }
}

// Track active thumbnail generation tasks
const activeThumbGenIds = new Set<number>();

export interface ThumbnailStatus {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  generating: boolean;
}

export function getThumbnailStatus(albumId: number): ThumbnailStatus {
  const db = getDb();
  const result = db.exec(
    `SELECT thumbnail_generated, COUNT(*) as cnt
     FROM media_files WHERE album_id = $albumId
     GROUP BY thumbnail_generated`,
    { $albumId: albumId },
  );

  let pending = 0, completed = 0, failed = 0;
  if (result.length) {
    for (const row of result[0].values) {
      const status = row[0] as number;
      const count = row[1] as number;
      if (status === 0) pending = count;
      else if (status === 1) completed = count;
      else if (status === 2) failed = count;
    }
  }

  return {
    total: pending + completed + failed,
    pending,
    completed,
    failed,
    generating: activeThumbGenIds.has(albumId),
  };
}

export function startThumbnailGeneration(albumId: number, retryFailed = true): boolean {
  if (activeThumbGenIds.has(albumId)) return false;
  activeThumbGenIds.add(albumId);

  // Fire and forget
  (async () => {
    try {
      const db = getDb();

      // Optionally reset failed thumbnails so they get retried
      if (retryFailed) {
        db.run(
          `UPDATE media_files SET thumbnail_generated = 0, thumbnail_path = NULL
           WHERE album_id = $albumId AND thumbnail_generated = 2`,
          { $albumId: albumId },
        );
      }

      // Generate all pending (loop until none left, since limit is 500 per batch)
      let hasMore = true;
      while (hasMore) {
        const result = db.exec(
          `SELECT ${MEDIA_COLUMNS}
           FROM media_files WHERE album_id = $albumId AND thumbnail_generated = 0 LIMIT 500`,
          { $albumId: albumId },
        );

        if (!result.length || !result[0].values.length) {
          hasMore = false;
          break;
        }

        const pending = result[0].values.map(rowToMedia);
        const concurrency = config.thumbnailConcurrency;
        for (let i = 0; i < pending.length; i += concurrency) {
          const batch = pending.slice(i, i + concurrency);
          await Promise.allSettled(batch.map((m: MediaFile) => generateThumbnail(m)));
        }

        // If we got less than 500, no more to process
        if (pending.length < 500) hasMore = false;
      }
    } catch (err) {
      console.error(`Thumbnail generation error for album ${albumId}:`, err);
    } finally {
      activeThumbGenIds.delete(albumId);
    }
  })();

  return true;
}

export function isThumbGenerationActive(albumId: number): boolean {
  return activeThumbGenIds.has(albumId);
}

