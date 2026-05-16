CREATE TABLE IF NOT EXISTS media_metadata (
    media_id INTEGER PRIMARY KEY,
    date_taken TEXT,
    camera_make TEXT,
    camera_model TEXT,
    lens TEXT,
    width INTEGER,
    height INTEGER,
    orientation INTEGER,
    iso INTEGER,
    focal_length REAL,
    f_number REAL,
    exposure_time REAL,
    gps_lat REAL,
    gps_lon REAL,
    FOREIGN KEY (media_id) REFERENCES media_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_metadata_date_taken ON media_metadata(date_taken);
