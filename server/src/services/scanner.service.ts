import fs from 'fs';
import path from 'path';
import { getDb, saveDb } from '../db/connection.js';
import { getExtension, isSupportedExtension, getFileType, getMimeType } from '../utils/mime.js';
import type { Album } from '../types/index.js';

// Track in-progress scans
const activeScanIds = new Set<number>();

interface FileEntry {
  absolutePath: string;
  relativePath: string;
  filename: string;
  size: number;
  mtime: string;
  birthtime: string;
  ext: string;
}

function walkDirectory(dir: string, rootDir: string): FileEntry[] {
  const entries: FileEntry[] = [];

  function walk(currentDir: string) {
    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return; // Skip unreadable directories
    }

    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);

      if (item.isDirectory()) {
        // Skip hidden directories and Synology metadata directories (@eaDir, etc.)
        if (!item.name.startsWith('.') && !item.name.startsWith('@')) {
          walk(fullPath);
        }
        continue;
      }

      if (!item.isFile()) continue;

      const ext = getExtension(item.name);
      if (!isSupportedExtension(ext)) continue;

      try {
        const stat = fs.statSync(fullPath);
        entries.push({
          absolutePath: fullPath,
          relativePath: path.relative(rootDir, fullPath),
          filename: item.name,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          birthtime: stat.birthtime.toISOString(),
          ext,
        });
      } catch {
        // Skip files we can't stat
      }
    }
  }

  walk(dir);
  return entries;
}

async function performScan(album: Album): Promise<void> {
  const db = getDb();

  try {
    // Set scanning status
    db.run(
      `UPDATE scan_state SET status = 'scanning', error_message = NULL WHERE album_id = $id`,
      { $id: album.id },
    );
    saveDb();

    // 1. Walk the filesystem
    const diskFiles = walkDirectory(album.path, album.path);
    const diskMap = new Map(diskFiles.map(f => [f.absolutePath, f]));

    // 2. Get existing DB entries
    const dbResult = db.exec(
      `SELECT id, file_path, modified_at, file_size FROM media_files WHERE album_id = $id`,
      { $id: album.id },
    );

    const dbEntries = new Map<string, { id: number; modified_at: string; file_size: number }>();
    if (dbResult.length) {
      for (const row of dbResult[0].values) {
        dbEntries.set(row[1] as string, {
          id: row[0] as number,
          modified_at: row[2] as string,
          file_size: row[3] as number,
        });
      }
    }

    // 3. Detect removals
    for (const [filePath, entry] of dbEntries) {
      if (!diskMap.has(filePath)) {
        db.run(`DELETE FROM media_files WHERE id = $id`, { $id: entry.id });
      }
    }

    // 4. Detect additions and changes
    for (const [filePath, file] of diskMap) {
      const existing = dbEntries.get(filePath);
      const fileType = getFileType(file.ext);
      const mimeType = getMimeType(file.ext);

      if (!existing) {
        // New file — use ON CONFLICT to handle re-scans where file_path may already exist from a different album entry
        db.run(
          `INSERT INTO media_files (album_id, file_path, relative_path, filename, file_type, file_size, mime_type, created_at, modified_at, thumbnail_generated)
           VALUES ($albumId, $filePath, $relativePath, $filename, $fileType, $fileSize, $mimeType, $createdAt, $modifiedAt, 0)
           ON CONFLICT(file_path) DO UPDATE SET
             album_id = $albumId, relative_path = $relativePath, filename = $filename,
             file_type = $fileType, file_size = $fileSize, mime_type = $mimeType,
             modified_at = $modifiedAt, scanned_at = datetime('now')`,
          {
            $albumId: album.id,
            $filePath: filePath,
            $relativePath: file.relativePath,
            $filename: file.filename,
            $fileType: fileType,
            $fileSize: file.size,
            $mimeType: mimeType,
            $createdAt: file.birthtime,
            $modifiedAt: file.mtime,
          },
        );
      } else if (existing.modified_at !== file.mtime || existing.file_size !== file.size) {
        // Changed file
        db.run(
          `UPDATE media_files SET file_size = $size, modified_at = $mtime, thumbnail_generated = 0, thumbnail_path = NULL, scanned_at = datetime('now')
           WHERE id = $id`,
          { $size: file.size, $mtime: file.mtime, $id: existing.id },
        );
      }
    }

    // 5. Update scan state
    db.run(
      `UPDATE scan_state SET status = 'completed', last_scan_at = datetime('now'), file_count = $count WHERE album_id = $id`,
      { $count: diskFiles.length, $id: album.id },
    );
    saveDb();

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.run(
      `UPDATE scan_state SET status = 'error', error_message = $msg WHERE album_id = $id`,
      { $msg: message, $id: album.id },
    );
    saveDb();
    throw err;
  } finally {
    activeScanIds.delete(album.id);
  }
}

export function startScan(album: Album, onComplete?: (albumId: number) => void): boolean {
  if (activeScanIds.has(album.id)) return false;
  activeScanIds.add(album.id);

  // Fire and forget
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
