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

    // Check if favorites should appear on home
    const favOnHomeSetting = db.exec("SELECT value FROM app_settings WHERE key = 'favorites_on_home'");
    const favOnHome = favOnHomeSetting.length && favOnHomeSetting[0].values.length
      ? favOnHomeSetting[0].values[0][0] === '1'
      : false;

    if (favOnHome) {
      const favSortOrderSetting = db.exec("SELECT value FROM app_settings WHERE key = 'favorites_sort_order'");
      const favSortOrder = favSortOrderSetting.length && favSortOrderSetting[0].values.length
        ? Number(favSortOrderSetting[0].values[0][0])
        : 9999;

      const favMediaResult = db.exec(
        `SELECT ${MEDIA_COLUMNS} FROM media_files WHERE is_favorite = 1 ORDER BY RANDOM() LIMIT $limit`,
        { $limit: limit },
      );
      const favMedia = favMediaResult.length ? favMediaResult[0].values.map(rowToMedia) : [];

      if (favMedia.length > 0) {
        const favCountResult = db.exec('SELECT COUNT(*) FROM media_files WHERE is_favorite = 1');
        const favCount = favCountResult.length ? (favCountResult[0].values[0][0] as number) : 0;

        const favAlbum: HomeAlbum = {
          id: -1,
          name: 'Favorites',
          path: '',
          created_at: '',
          updated_at: '',
          sort_order: favSortOrder,
          file_count: favCount,
          is_favorites: true,
          media: favMedia,
        };

        const insertPos = Math.min(favSortOrder, result.length);
        result.splice(insertPos, 0, favAlbum);
      }
    }

    res.json({ albums: result });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to load home data') });
  }
});

export default router;
