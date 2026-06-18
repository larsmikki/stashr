import { Router, Request, Response } from 'express';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// archiver is a CommonJS module with a function-shaped default export.
const archiver: typeof import('archiver') = require('archiver');
import { getDb } from '../db/connection.js';
import { rowToMedia, MEDIA_COLUMNS, getErrorMessage } from '../utils/db.js';

const router = Router();

// Streamed zip download of a selection of media files. The client passes a
// comma-separated `ids` query parameter so it can be used as an <a href>.
router.get('/media/bulk-download', (req: Request, res: Response) => {
  try {
    const raw = String(req.query.ids ?? '');
    const ids = raw
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => Number.isInteger(n) && n > 0);
    if (!ids.length) {
      res.status(400).json({ error: 'ids query param is required' });
      return;
    }

    const db = getDb();
    // Build a placeholder list for the IN clause — all values are validated integers.
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.raw
      .prepare(`SELECT ${MEDIA_COLUMNS} FROM media_files WHERE id IN (${placeholders})`)
      .raw()
      .all(...ids) as unknown[][];

    if (!rows.length) {
      res.status(404).json({ error: 'No media found for the given ids' });
      return;
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stashr-${ids.length}-items.zip"`,
    );

    const archive = archiver('zip', { zlib: { level: 0 } }); // store-only — media is already compressed
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') console.error('zip warning:', err);
    });
    archive.on('error', (err) => {
      console.error('zip error:', err);
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    archive.pipe(res);

    // De-dup filenames inside the archive — files from different albums may share names.
    const used = new Set<string>();
    for (const row of rows) {
      const media = rowToMedia(row);
      if (!fs.existsSync(media.file_path)) continue;
      let name = media.filename;
      if (used.has(name)) {
        const dot = name.lastIndexOf('.');
        const base = dot > 0 ? name.slice(0, dot) : name;
        const ext = dot > 0 ? name.slice(dot) : '';
        let i = 1;
        while (used.has(`${base} (${i})${ext}`)) i++;
        name = `${base} (${i})${ext}`;
      }
      used.add(name);
      archive.file(media.file_path, { name });
    }

    archive.finalize();
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to build zip') });
  }
});

// Fetch a single media item's EXIF metadata for the viewer info panel.
router.get('/media/:mediaId/metadata', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const mediaId = Number(req.params.mediaId);
    const result = db.exec(
      `SELECT camera_make, camera_model, lens, width, height,
              orientation, iso, focal_length, f_number, exposure_time, gps_lat, gps_lon
       FROM media_metadata WHERE media_id = $id`,
      { $id: mediaId },
    );
    if (!result.length || !result[0].values.length) {
      res.json(null);
      return;
    }
    const r = result[0].values[0];
    res.json({
      camera_make: r[0], camera_model: r[1], lens: r[2],
      width: r[3], height: r[4], orientation: r[5], iso: r[6],
      focal_length: r[7], f_number: r[8], exposure_time: r[9],
      gps_lat: r[10], gps_lon: r[11],
    });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to fetch metadata') });
  }
});

export default router;
