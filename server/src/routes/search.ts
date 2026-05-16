import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';
import { rowToMedia, MEDIA_COLUMNS, getErrorMessage } from '../utils/db.js';
import type { MediaFile, PaginatedResponse } from '../types/index.js';

const router = Router();

// Convert a free-text query into an FTS5 prefix-match expression. Each token
// becomes "token*" so partial filenames match; tokens are AND-combined.
function buildFtsQuery(q: string): string {
  const tokens = q
    .replace(/["']/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
  if (!tokens.length) return '';
  return tokens.map(t => `"${t}"*`).join(' AND ');
}

router.get('/search', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const q = String(req.query.q ?? '').trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      config.maxPageSize,
      Math.max(1, Number(req.query.limit) || config.defaultPageSize),
    );
    const offset = (page - 1) * limit;

    if (!q) {
      const empty: PaginatedResponse<MediaFile> = { items: [], total: 0, page, totalPages: 0 };
      res.json(empty);
      return;
    }

    const fts = buildFtsQuery(q);
    if (!fts) {
      const empty: PaginatedResponse<MediaFile> = { items: [], total: 0, page, totalPages: 0 };
      res.json(empty);
      return;
    }

    const albumIdParam = req.query.albumId ? Number(req.query.albumId) : null;
    const albumFilter = albumIdParam ? 'AND m.album_id = $albumId' : '';

    const countResult = db.exec(
      `SELECT COUNT(*) FROM media_files m
       JOIN media_search s ON s.rowid = m.id
       WHERE media_search MATCH $q ${albumFilter}`,
      albumIdParam
        ? { $q: fts, $albumId: albumIdParam }
        : { $q: fts },
    );
    const total = countResult.length ? (countResult[0].values[0][0] as number) : 0;

    const result = db.exec(
      `SELECT ${MEDIA_COLUMNS.split(', ').map(c => `m.${c}`).join(', ')}
       FROM media_files m
       JOIN media_search s ON s.rowid = m.id
       WHERE media_search MATCH $q ${albumFilter}
       ORDER BY bm25(media_search), m.filename
       LIMIT $limit OFFSET $offset`,
      albumIdParam
        ? { $q: fts, $albumId: albumIdParam, $limit: limit, $offset: offset }
        : { $q: fts, $limit: limit, $offset: offset },
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
    res.status(500).json({ error: getErrorMessage(err, 'Search failed') });
  }
});

export default router;
