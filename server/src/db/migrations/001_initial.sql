CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_album ON media_files(album_id);
CREATE INDEX IF NOT EXISTS idx_media_filepath ON media_files(file_path);

CREATE TABLE IF NOT EXISTS scan_state (
    album_id INTEGER PRIMARY KEY,
    last_scan_at TEXT,
    status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'scanning', 'completed', 'error')),
    file_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);
