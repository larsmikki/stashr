-- FTS5 index on filename + relative_path for global media search.
CREATE VIRTUAL TABLE IF NOT EXISTS media_search USING fts5(
    filename,
    relative_path,
    content='media_files',
    content_rowid='id',
    tokenize='unicode61'
);

INSERT INTO media_search(rowid, filename, relative_path)
    SELECT id, filename, relative_path FROM media_files
    WHERE NOT EXISTS (SELECT 1 FROM media_search WHERE rowid = media_files.id);

CREATE TRIGGER IF NOT EXISTS media_files_ai AFTER INSERT ON media_files BEGIN
    INSERT INTO media_search(rowid, filename, relative_path)
    VALUES (new.id, new.filename, new.relative_path);
END;

CREATE TRIGGER IF NOT EXISTS media_files_ad AFTER DELETE ON media_files BEGIN
    INSERT INTO media_search(media_search, rowid, filename, relative_path)
    VALUES ('delete', old.id, old.filename, old.relative_path);
END;

CREATE TRIGGER IF NOT EXISTS media_files_au AFTER UPDATE ON media_files BEGIN
    INSERT INTO media_search(media_search, rowid, filename, relative_path)
    VALUES ('delete', old.id, old.filename, old.relative_path);
    INSERT INTO media_search(rowid, filename, relative_path)
    VALUES (new.id, new.filename, new.relative_path);
END;
