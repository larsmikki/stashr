import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection.js';
import { listAlbums } from '../services/album.service.js';
import { config } from '../config.js';
import { rowToMedia, MEDIA_COLUMNS, getErrorMessage } from '../utils/db.js';
import type { HomeAlbum } from '../types/index.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const albums = listAlbums();
    const limit = config.thumbsPerAlbumHome;

    const result: HomeAlbum[] = albums.map(album => {
      const mediaResult = db.exec(
        `SELECT ${MEDIA_COLUMNS}
         FROM media_files WHERE album_id = $id ORDER BY RANDOM() LIMIT $limit`,
        { $id: album.id, $limit: limit },
      );

      const media = mediaResult.length ? mediaResult[0].values.map(rowToMedia) : [];

      return { ...album, media };
    });

    res.json({ albums: result });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to load home data') });
  }
});

export default router;
