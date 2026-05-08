import initSqlJs, { type Database } from 'sql.js';

// Full schema combining all 5 migrations
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

let sqlInstance: Awaited<ReturnType<typeof initSqlJs>> | null = null;

export async function createTestDb(): Promise<Database> {
  if (!sqlInstance) {
    sqlInstance = await initSqlJs();
  }
  const db = new sqlInstance.Database();
  db.exec(SCHEMA);
  return db;
}
