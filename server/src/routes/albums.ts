import { Router, Request, Response } from 'express';
import * as albumService from '../services/album.service.js';
import { startScan } from '../services/scanner.service.js';
import { getThumbnailStatus, startThumbnailGeneration } from '../services/thumbnail.service.js';
import { getDb } from '../db/connection.js';
import { getErrorMessage } from '../utils/db.js';

const router = Router();

// List all albums
router.get('/', (_req: Request, res: Response) => {
  try {
    const albums = albumService.listAlbums();
    res.json(albums);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to list albums') });
  }
});

// Reorder albums
router.put('/reorder', (req: Request, res: Response) => {
  const { albumIds } = req.body;
  if (!Array.isArray(albumIds) || !albumIds.every(id => typeof id === 'number')) {
    return res.status(400).json({ error: 'albumIds must be an array of numbers' });
  }
  try {
    albumService.reorderAlbums(albumIds);
    res.json({ status: 'ok' });
  } catch (err) {
    const message = getErrorMessage(err, 'Failed to reorder albums');
    res.status(400).json({ error: message });
  }
});

// Get single album
router.get('/:id', (req: Request, res: Response) => {
  try {
    const album = albumService.getAlbum(Number(req.params.id));
    if (!album) return res.status(404).json({ error: 'Album not found' });
    res.json(album);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to get album') });
  }
});

// Create album
router.post('/', (req: Request, res: Response) => {
  const { name, path } = req.body;
  if (!name || !path) {
    return res.status(400).json({ error: 'Name and path are required' });
  }
  try {
    const album = albumService.createAlbum(name, path);
    res.status(201).json(album);
  } catch (err) {
    const message = getErrorMessage(err, 'Failed to create album');
    res.status(400).json({ error: message });
  }
});

// Update album
router.put('/:id', (req: Request, res: Response) => {
  const { name, path } = req.body;
  try {
    const album = albumService.updateAlbum(Number(req.params.id), name, path);
    res.json(album);
  } catch (err) {
    const message = getErrorMessage(err, 'Failed to update album');
    res.status(400).json({ error: message });
  }
});

// Delete album
router.delete('/:id', (req: Request, res: Response) => {
  try {
    albumService.deleteAlbum(Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    const message = getErrorMessage(err, 'Failed to delete album');
    res.status(400).json({ error: message });
  }
});

// Scan album
router.post('/:id/scan', (req: Request, res: Response) => {
  try {
    const album = albumService.getAlbum(Number(req.params.id));
    if (!album) return res.status(404).json({ error: 'Album not found' });

    const started = startScan(album, (albumId) => startThumbnailGeneration(albumId));
    if (!started) {
      return res.json({ status: 'already_scanning' });
    }
    res.json({ status: 'started' });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to start scan') });
  }
});

// Get scan status
router.get('/:id/scan-status', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = db.exec(
      `SELECT status, last_scan_at, file_count, error_message FROM scan_state WHERE album_id = $id`,
      { $id: Number(req.params.id) },
    );
    if (!result.length || !result[0].values.length) {
      return res.json({ status: 'idle', file_count: 0 });
    }
    const row = result[0].values[0];
    res.json({
      status: row[0],
      last_scan_at: row[1],
      file_count: row[2],
      error_message: row[3],
    });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to get scan status') });
  }
});

// Scan all albums
router.post('/scan-all', (_req: Request, res: Response) => {
  try {
    const albums = albumService.listAlbums();
    let started = 0;
    for (const album of albums) {
      if (startScan(album)) started++;
    }
    res.json({ status: 'started', albumCount: started });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to start scan') });
  }
});

// Get thumbnail generation status for an album
router.get('/:id/thumbnail-status', (req: Request, res: Response) => {
  try {
    const album = albumService.getAlbum(Number(req.params.id));
    if (!album) return res.status(404).json({ error: 'Album not found' });

    res.json(getThumbnailStatus(album.id));
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to get thumbnail status') });
  }
});

// Generate thumbnails for a single album
router.post('/:id/generate-thumbnails', (req: Request, res: Response) => {
  const album = albumService.getAlbum(Number(req.params.id));
  if (!album) return res.status(404).json({ error: 'Album not found' });

  const started = startThumbnailGeneration(album.id);
  if (!started) {
    return res.json({ status: 'already_generating' });
  }
  res.json({ status: 'started' });
});

// Generate thumbnails for all albums
router.post('/generate-all-thumbnails', (_req: Request, res: Response) => {
  const albums = albumService.listAlbums();
  let started = 0;
  for (const album of albums) {
    if (startThumbnailGeneration(album.id)) started++;
  }
  res.json({ status: 'started', albumCount: started });
});

export default router;
