import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';
import { generateThumbnail } from '../services/thumbnail.service.js';
import { rowToMedia, MEDIA_COLUMNS, getErrorMessage } from '../utils/db.js';

const router = Router();

// Placeholder SVGs
const IMAGE_PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <rect width="300" height="300" fill="#e5e7eb"/>
  <text x="150" y="150" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-family="sans-serif" font-size="14">No Preview</text>
</svg>`;

const VIDEO_PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <rect width="300" height="300" fill="#1f2937"/>
  <circle cx="150" cy="140" r="40" fill="none" stroke="#6b7280" stroke-width="3"/>
  <polygon points="140,122 140,158 168,140" fill="#6b7280"/>
  <text x="150" y="200" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="13">Video</text>
</svg>`;

router.get('/:mediaId', async (req: Request, res: Response) => {
  const db = getDb();
  const mediaId = Number(req.params.mediaId);

  let media;
  try {
    const result = db.exec(
      `SELECT ${MEDIA_COLUMNS}
       FROM media_files WHERE id = $id`,
      { $id: mediaId },
    );

    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ error: 'Media not found' });
    }

    media = rowToMedia(result[0].values[0]);
  } catch (err) {
    return res.status(500).json({ error: getErrorMessage(err, 'Failed to fetch media') });
  }

  // Already generated — serve it
  if (media.thumbnail_generated === 1 && media.thumbnail_path && fs.existsSync(media.thumbnail_path)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(path.resolve(media.thumbnail_path));
  }

  // Failed previously — return placeholder
  if (media.thumbnail_generated === 2) {
    const placeholder = media.file_type === 'video' ? VIDEO_PLACEHOLDER : IMAGE_PLACEHOLDER;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(placeholder);
  }

  // Generate on-the-fly
  try {
    const thumbPath = await generateThumbnail(media);
    if (thumbPath && fs.existsSync(thumbPath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(path.resolve(thumbPath));
    }
  } catch (err) {
    console.error(`On-the-fly thumbnail generation failed for media ${mediaId}:`, err);
  }

  const placeholder = media.file_type === 'video' ? VIDEO_PLACEHOLDER : IMAGE_PLACEHOLDER;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(placeholder);
});

export default router;
