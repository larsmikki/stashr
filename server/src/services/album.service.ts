import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';
import { safePath } from '../utils/paths.js';
import { config } from '../config.js';
import type { Album } from '../types/index.js';

function rowToAlbum(row: unknown[]): Album {
  return {
    id: row[0] as number,
    name: row[1] as string,
    path: row[2] as string,
    created_at: row[3] as string,
    updated_at: row[4] as string,
    sort_order: row[5] as number,
    scan_status: (row[6] as string) || 'idle',
    last_scan_at: row[7] as string | null,
    file_count: (row[8] as number) || 0,
  };
}

const LIST_SQL = `
  SELECT a.id, a.name, a.path, a.created_at, a.updated_at, a.sort_order,
         COALESCE(s.status, 'idle') as scan_status,
         s.last_scan_at,
         COALESCE(s.file_count, 0) as file_count
  FROM albums a
  LEFT JOIN scan_state s ON s.album_id = a.id
  ORDER BY a.sort_order, a.name
`;

export function listAlbums(): Album[] {
  const db = getDb();
  const result = db.exec(LIST_SQL);
  if (!result.length) return [];
  return result[0].values.map(rowToAlbum);
}

const GET_SQL = `
  SELECT a.id, a.name, a.path, a.created_at, a.updated_at, a.sort_order,
         COALESCE(s.status, 'idle') as scan_status,
         s.last_scan_at,
         COALESCE(s.file_count, 0) as file_count
  FROM albums a
  LEFT JOIN scan_state s ON s.album_id = a.id
  WHERE a.id = $id
`;

export function getAlbum(id: number): Album | null {
  const db = getDb();
  const result = db.exec(GET_SQL, { $id: id });
  if (!result.length || !result[0].values.length) return null;
  return rowToAlbum(result[0].values[0]);
}

export function createAlbum(name: string, albumPath: string): Album {
  const db = getDb();
  const resolved = safePath(albumPath);

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error('Path does not exist or is not a directory');
  }

  // Put new album at the end of the sort order
  const maxResult = db.exec('SELECT COALESCE(MAX(sort_order), 0) FROM albums');
  const maxOrder = maxResult.length ? maxResult[0].values[0][0] as number : 0;

  db.run(
    `INSERT INTO albums (name, path, sort_order) VALUES ($name, $path, $order)`,
    { $name: name.trim(), $path: resolved, $order: maxOrder + 1 },
  );

  // Get the inserted ID
  const result = db.exec('SELECT last_insert_rowid()');
  const id = result[0].values[0][0] as number;

  // Create scan_state entry
  db.run(
    `INSERT INTO scan_state (album_id) VALUES ($id)`,
    { $id: id },
  );


  return getAlbum(id)!;
}

export function updateAlbum(id: number, name?: string, albumPath?: string): Album {
  const db = getDb();
  const existing = getAlbum(id);
  if (!existing) throw new Error('Album not found');

  const newName = name?.trim() || existing.name;
  let newPath = existing.path;

  if (albumPath && albumPath !== existing.path) {
    newPath = safePath(albumPath);
    if (!fs.existsSync(newPath) || !fs.statSync(newPath).isDirectory()) {
      throw new Error('Path does not exist or is not a directory');
    }

    // Path changed — clear media and thumbnails for this album
    db.run(`DELETE FROM media_files WHERE album_id = $id`, { $id: id });
    db.run(
      `UPDATE scan_state SET status = 'idle', file_count = 0, last_scan_at = NULL WHERE album_id = $id`,
      { $id: id },
    );

    // Delete cached thumbnails
    const thumbDir = path.join(config.cacheDir, 'thumbnails', String(id));
    if (fs.existsSync(thumbDir)) {
      fs.rmSync(thumbDir, { recursive: true, force: true });
    }
  }

  db.run(
    `UPDATE albums SET name = $name, path = $path, updated_at = datetime('now') WHERE id = $id`,
    { $name: newName, $path: newPath, $id: id },
  );

  return getAlbum(id)!;
}

export function reorderAlbums(albumIds: number[]): void {
  const db = getDb();
  for (let i = 0; i < albumIds.length; i++) {
    db.run(
      `UPDATE albums SET sort_order = $order, updated_at = datetime('now') WHERE id = $id`,
      { $order: i, $id: albumIds[i] },
    );
  }
}

export function deleteAlbum(id: number): void {
  const db = getDb();

  // Delete cached thumbnails
  const thumbDir = path.join(config.cacheDir, 'thumbnails', String(id));
  if (fs.existsSync(thumbDir)) {
    fs.rmSync(thumbDir, { recursive: true, force: true });
  }

  // Delete cached transcodes for this album's media
  const mediaResult = db.exec(
    `SELECT id FROM media_files WHERE album_id = $id`,
    { $id: id },
  );
  if (mediaResult.length) {
    for (const row of mediaResult[0].values) {
      const transcodeDir = path.join(config.cacheDir, 'transcoded', String(row[0]));
      if (fs.existsSync(transcodeDir)) {
        fs.rmSync(transcodeDir, { recursive: true, force: true });
      }
    }
  }

  db.run(`DELETE FROM albums WHERE id = $id`, { $id: id });
}
