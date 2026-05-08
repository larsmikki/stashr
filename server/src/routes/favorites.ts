import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db/connection.js';
import { config } from '../config.js';
import { rowToMedia, MEDIA_COLUMNS, getErrorMessage } from '../utils/db.js';
import type { MediaFile, PaginatedResponse } from '../types/index.js';

const router = Router();

// Toggle favorite status for a media item
router.put('/media/:mediaId/favorite', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const mediaId = Number(req.params.mediaId);

    const existing = db.exec(`SELECT ${MEDIA_COLUMNS} FROM media_files WHERE id = $id`, { $id: mediaId });
    if (!existing.length || !existing[0].values.length) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }

    const media = rowToMedia(existing[0].values[0]);
    const newValue = media.is_favorite ? 0 : 1;

    db.run('UPDATE media_files SET is_favorite = $val WHERE id = $id', { $val: newValue, $id: mediaId });
    saveDb();

    const updated = db.exec(`SELECT ${MEDIA_COLUMNS} FROM media_files WHERE id = $id`, { $id: mediaId });
    res.json(rowToMedia(updated[0].values[0]));
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to toggle favorite') });
  }
});

// Get all favorites (paginated)
router.get('/favorites', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const sort = req.query.sort === 'name' ? 'name' : 'date';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      config.maxPageSize,
      Math.max(1, Number(req.query.limit) || config.defaultPageSize),
    );
    const offset = (page - 1) * limit;

    const orderColumn = sort === 'name' ? 'filename' : 'created_at';

    const countResult = db.exec('SELECT COUNT(*) FROM media_files WHERE is_favorite = 1');
    const total = countResult.length ? (countResult[0].values[0][0] as number) : 0;

    const result = db.exec(
      `SELECT ${MEDIA_COLUMNS}
       FROM media_files WHERE is_favorite = 1
       ORDER BY ${orderColumn} ${order}
       LIMIT $limit OFFSET $offset`,
      { $limit: limit, $offset: offset },
    );

    const items = result.length ? result[0].values.map(rowToMedia) : [];

    const response: PaginatedResponse<MediaFile> = {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to fetch favorites') });
  }
});

export default router;
