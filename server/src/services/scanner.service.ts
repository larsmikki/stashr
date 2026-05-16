import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { getDb } from '../db/connection.js';
import { getExtension, isSupportedExtension, getFileType, getMimeType } from '../utils/mime.js';
import { extractImageMetadata, upsertMetadata } from './metadata.service.js';
import type { Album } from '../types/index.js';

// Track in-progress scans
const activeScanIds = new Set<number>();

const BATCH_SIZE = 500;

interface FileEntry {
  absolutePath: string;
  relativePath: string;
  filename: string;
  size: number;
  mtime: string;
  birthtime: string;
  ext: string;
}

// Async iterator over supported media files under `dir`. Skips hidden dirs and
// Synology metadata directories (@eaDir, etc.). Yields entries lazily so callers
// can process them incrementally without holding the entire library in memory.
async function* walkDirectory(dir: string, rootDir: string): AsyncGenerator<FileEntry> {
  let dirHandle: fs.Dir;
  try {
    dirHandle = await fsp.opendir(dir);
  } catch {
    return; // Skip unreadable directories
  }

  for await (const item of dirHandle) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (!item.name.startsWith('.') && !item.name.startsWith('@')) {
        yield* walkDirectory(fullPath, rootDir);
      }
      continue;
    }

    if (!item.isFile()) continue;

    const ext = getExtension(item.name);
    if (!isSupportedExtension(ext)) continue;

    let stat: fs.Stats;
    try {
      stat = await fsp.stat(fullPath);
    } catch {
      continue; // Skip files we can't stat
    }

    yield {
      absolutePath: fullPath,
      relativePath: path.relative(rootDir, fullPath),
      filename: item.name,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      birthtime: stat.birthtime.toISOString(),
      ext,
    };
  }
}

async function performScan(album: Album): Promise<void> {
  const db = getDb();
  const raw = db.raw;

  try {
    db.run(
      `UPDATE scan_state SET status = 'scanning', error_message = NULL WHERE album_id = $id`,
      { $id: album.id },
    );

    // Load existing DB entries upfront (keyed by absolute path).
    const dbEntries = new Map<string, { id: number; modified_at: string; file_size: number }>();
    const dbResult = db.exec(
      `SELECT id, file_path, modified_at, file_size FROM media_files WHERE album_id = $id`,
      { $id: album.id },
    );
    if (dbResult.length) {
      for (const row of dbResult[0].values) {
        dbEntries.set(row[1] as string, {
          id: row[0] as number,
          modified_at: row[2] as string,
          file_size: row[3] as number,
        });
      }
    }

    // Prepared statements (held inside the transaction closure for batched writes).
    const insertStmt = raw.prepare(
      `INSERT INTO media_files (album_id, file_path, relative_path, filename, file_type, file_size, mime_type, created_at, modified_at, thumbnail_generated)
       VALUES (@albumId, @filePath, @relativePath, @filename, @fileType, @fileSize, @mimeType, @createdAt, @modifiedAt, 0)
       ON CONFLICT(file_path) DO UPDATE SET
         album_id = @albumId, relative_path = @relativePath, filename = @filename,
         file_type = @fileType, file_size = @fileSize, mime_type = @mimeType,
         modified_at = @modifiedAt, scanned_at = datetime('now')`,
    );
    const updateStmt = raw.prepare(
      `UPDATE media_files SET file_size = @size, modified_at = @mtime,
         thumbnail_generated = 0, thumbnail_path = NULL, scanned_at = datetime('now')
       WHERE id = @id`,
    );
    const deleteStmt = raw.prepare(`DELETE FROM media_files WHERE id = @id`);
    const updateProgress = raw.prepare(
      `UPDATE scan_state SET file_count = @count WHERE album_id = @id`,
    );

    type Op =
      | { kind: 'insert'; file: FileEntry; fileType: 'image' | 'video'; mimeType: string }
      | { kind: 'update'; id: number; size: number; mtime: string };

    const applyBatch = raw.transaction((ops: Op[]) => {
      for (const op of ops) {
        if (op.kind === 'insert') {
          insertStmt.run({
            albumId: album.id,
            filePath: op.file.absolutePath,
            relativePath: op.file.relativePath,
            filename: op.file.filename,
            fileType: op.fileType,
            fileSize: op.file.size,
            mimeType: op.mimeType,
            createdAt: op.file.birthtime,
            modifiedAt: op.file.mtime,
          });
        } else {
          updateStmt.run({ id: op.id, size: op.size, mtime: op.mtime });
        }
      }
    });

    // Walk the filesystem, collecting seen paths and batching add/change ops.
    const seenPaths = new Set<string>();
    let pending: Op[] = [];
    let totalSeen = 0;

    for await (const file of walkDirectory(album.path, album.path)) {
      seenPaths.add(file.absolutePath);
      totalSeen++;

      const existing = dbEntries.get(file.absolutePath);
      if (!existing) {
        pending.push({
          kind: 'insert',
          file,
          fileType: getFileType(file.ext) as 'image' | 'video',
          mimeType: getMimeType(file.ext),
        });
      } else if (existing.modified_at !== file.mtime || existing.file_size !== file.size) {
        pending.push({ kind: 'update', id: existing.id, size: file.size, mtime: file.mtime });
      }

      if (pending.length >= BATCH_SIZE) {
        applyBatch(pending);
        pending = [];
        updateProgress.run({ id: album.id, count: totalSeen });
        // Yield to the event loop so HTTP requests stay responsive during large scans.
        await new Promise<void>(resolve => setImmediate(resolve));
      }
    }

    if (pending.length) {
      applyBatch(pending);
    }

    // Detect removals (anything in DB that wasn't seen on disk).
    const removals: number[] = [];
    for (const [filePath, entry] of dbEntries) {
      if (!seenPaths.has(filePath)) removals.push(entry.id);
    }
    if (removals.length) {
      const deleteBatch = raw.transaction((ids: number[]) => {
        for (const id of ids) deleteStmt.run({ id });
      });
      deleteBatch(removals);
    }

    db.run(
      `UPDATE scan_state SET status = 'completed', last_scan_at = datetime('now'), file_count = $count WHERE album_id = $id`,
      { $count: totalSeen, $id: album.id },
    );

    // Extract EXIF metadata for any images missing it. Runs after the scan
    // proper so the user sees results sooner; safe to fail silently per file.
    void extractAlbumMetadata(album.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.run(
      `UPDATE scan_state SET status = 'error', error_message = $msg WHERE album_id = $id`,
      { $msg: message, $id: album.id },
    );
    throw err;
  } finally {
    activeScanIds.delete(album.id);
  }
}

export function startScan(album: Album, onComplete?: (albumId: number) => void): boolean {
  if (activeScanIds.has(album.id)) return false;
  activeScanIds.add(album.id);

  performScan(album)
    .then(() => onComplete?.(album.id))
    .catch(err => {
      console.error(`Scan failed for album ${album.id}:`, err);
    });

  return true;
}

export function isScanActive(albumId: number): boolean {
  return activeScanIds.has(albumId);
}

async function extractAlbumMetadata(albumId: number): Promise<void> {
  const db = getDb();
  const result = db.exec(
    `SELECT m.id, m.file_path
     FROM media_files m
     LEFT JOIN media_metadata mm ON mm.media_id = m.id
     WHERE m.album_id = $id AND m.file_type = 'image' AND mm.media_id IS NULL`,
    { $id: albumId },
  );
  if (!result.length) return;

  const pending = result[0].values.map(row => ({
    id: row[0] as number,
    path: row[1] as string,
  }));

  const CONCURRENCY = 4;
  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    await Promise.allSettled(batch.map(async ({ id, path: p }) => {
      const meta = await extractImageMetadata(p);
      if (meta) upsertMetadata(id, meta);
    }));
  }
}
