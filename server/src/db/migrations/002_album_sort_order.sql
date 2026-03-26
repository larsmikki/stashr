ALTER TABLE albums ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
UPDATE albums SET sort_order = id;
