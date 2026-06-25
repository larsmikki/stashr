import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection.js';
import { listAlbums } from '../services/album.service.js';
import { rowToMedia, MEDIA_COLUMNS, getErrorMessage } from '../utils/db.js';
import type { MediaFile } from '../types/index.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const albums = listAlbums();
    if (!albums.length) {
      res.json({ items: [] });
      return;
    }

    const perAlbum = Math.ceil(100 / albums.length);
    const items: MediaFile[] = [];

    for (const album of albums) {
      const result = db.exec(
        `SELECT ${MEDIA_COLUMNS} FROM media_files WHERE album_id = $id ORDER BY RANDOM() LIMIT $limit`,
        { $id: album.id, $limit: perAlbum },
      );
      if (result.length) items.push(...result[0].values.map(rowToMedia));
    }

    // ponytail: Fisher-Yates shuffle so albums don't appear grouped
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    res.json({ items: items.slice(0, 100) });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to load wall') });
  }
});

export default router;
