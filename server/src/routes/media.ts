import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';
import { rowToMedia, MEDIA_COLUMNS, getErrorMessage } from '../utils/db.js';
import type { MediaFile, PaginatedResponse } from '../types/index.js';

const router = Router();

// List media in an album
router.get('/:albumId/media', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const albumId = Number(req.params.albumId);
    const sortParam = req.query.sort;
    const sort = sortParam === 'name' ? 'name'
      : sortParam === 'random' ? 'random'
      : sortParam === 'date_taken' ? 'date_taken'
      : 'date';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      config.maxPageSize,
      Math.max(1, Number(req.query.limit) || config.defaultPageSize),
    );
    const offset = (page - 1) * limit;

    // For date_taken, prefer EXIF date but fall back to filesystem created_at
    // so files without EXIF still sort sensibly.
    const orderClause = sort === 'random'
      ? 'RANDOM()'
      : sort === 'date_taken'
        ? `COALESCE(mm.date_taken, m.created_at) ${order}`
        : sort === 'name'
          ? `m.filename ${order}`
          : `m.created_at ${order}`;

    const countResult = db.exec(
      `SELECT COUNT(*) FROM media_files WHERE album_id = $id`,
      { $id: albumId },
    );
    const total = countResult.length ? (countResult[0].values[0][0] as number) : 0;

    const result = db.exec(
      `SELECT ${MEDIA_COLUMNS.split(', ').map(c => `m.${c}`).join(', ')}
       FROM media_files m
       LEFT JOIN media_metadata mm ON mm.media_id = m.id
       WHERE m.album_id = $id
       ORDER BY ${orderClause}
       LIMIT $limit OFFSET $offset`,
      { $id: albumId, $limit: limit, $offset: offset },
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
    res.status(500).json({ error: getErrorMessage(err, 'Failed to fetch media') });
  }
});

export default router;
