import Database from 'better-sqlite3';
import type { CompatDb } from '../../src/db/connection.js';

// Full schema combining all migrations
const SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS media_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    relative_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK(file_type IN ('image', 'video')),
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TEXT,
    modified_at TEXT NOT NULL,
    scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
    thumbnail_path TEXT,
    thumbnail_generated INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_media_album ON media_files(album_id);
  CREATE INDEX IF NOT EXISTS idx_media_filepath ON media_files(file_path);

  CREATE TABLE IF NOT EXISTS scan_state (
    album_id INTEGER PRIMARY KEY,
    last_scan_at TEXT,
    status TEXT NOT NULL DEFAULT 'idle',
    file_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('favorites_on_home', '0');
  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('favorites_sort_order', '9999');
`;

function stripPrefix(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(params)) {
    const name = k.startsWith('$') || k.startsWith('@') || k.startsWith(':') ? k.slice(1) : k;
    out[name] = params[k];
  }
  return out;
}

function isMultiStatement(sql: string): boolean {
  const stripped = sql.replace(/'(?:''|[^'])*'/g, '').replace(/--[^\n]*/g, '');
  return stripped.split(';').map(s => s.trim()).filter(Boolean).length > 1;
}

export async function createTestDb(): Promise<CompatDb> {
  const raw = new Database(':memory:');
  raw.pragma('foreign_keys = ON');
  raw.exec(SCHEMA);

  return {
    raw,
    run(sql, params) {
      if (!params) {
        if (isMultiStatement(sql)) {
          raw.exec(sql);
          return;
        }
        raw.prepare(sql).run();
        return;
      }
      raw.prepare(sql).run(stripPrefix(params));
    },
    exec(sql, params) {
      const stmt = raw.prepare(sql);
      if (!stmt.reader) {
        if (params) stmt.run(stripPrefix(params));
        else stmt.run();
        return [];
      }
      const rows = (params ? stmt.raw().all(stripPrefix(params)) : stmt.raw().all()) as unknown[][];
      if (!rows.length) return [];
      const columns = stmt.columns().map(c => c.name);
      return [{ columns, values: rows }];
    },
    transaction(fn) {
      return raw.transaction(fn)();
    },
  };
}
