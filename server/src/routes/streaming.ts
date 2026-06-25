import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  startTranscode,
  getPlaylistPath,
  getSegmentPath,
  isTranscoded,
  isTranscoding,
  getMediaById,
  getAlbumPath,
} from '../services/streaming.service.js';
import { parseRange } from '../utils/stream.js';
import { ensureWithin } from '../utils/paths.js';

const router = Router();

// Direct streaming with range support
router.get('/:mediaId/stream', (req: Request, res: Response) => {
  try {
    const media = getMediaById(Number(req.params.mediaId));
    if (!media) return res.status(404).json({ error: 'Media not found' });

    const albumPath = getAlbumPath(media.album_id);
    if (!albumPath) return res.status(404).json({ error: 'Album not found' });
    try { ensureWithin(media.file_path, albumPath); } catch {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(media.file_path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    const stat = fs.statSync(media.file_path);
    const fileSize = stat.size;

    const range = parseRange(req.headers.range, fileSize);

    if (range) {
      const { start, end } = range;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(media.file_path, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': media.mime_type,
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': media.mime_type,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(media.file_path).pipe(res);
    }
  } catch (err) {
    console.error('Streaming error:', err);
    res.status(500).json({ error: 'Internal streaming error' });
  }
});

// Full file serving for images
router.get('/:mediaId/full', (req: Request, res: Response) => {
  try {
    const media = getMediaById(Number(req.params.mediaId));
    if (!media) return res.status(404).json({ error: 'Media not found' });

    const albumPath = getAlbumPath(media.album_id);
    if (albumPath) {
      try { ensureWithin(media.file_path, albumPath); } catch {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (!fs.existsSync(media.file_path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', media.mime_type);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.resolve(media.file_path));
  } catch (err) {
    console.error('File serving error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// HLS playlist
router.get('/:mediaId/transcode/playlist.m3u8', async (req: Request, res: Response) => {
  try {
    const media = getMediaById(Number(req.params.mediaId));
    if (!media) return res.status(404).json({ error: 'Media not found' });

    if (isTranscoded(media.id)) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.sendFile(path.resolve(getPlaylistPath(media.id)));
    }

    // Start transcoding if not already running
    if (!isTranscoding(media.id)) {
      startTranscode(media).catch(err => {
        console.error(`Transcoding failed for media ${media.id}:`, err);
      });
    }

    // Wait a bit for ffmpeg to write the initial playlist
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (fs.existsSync(getPlaylistPath(media.id))) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        return res.sendFile(path.resolve(getPlaylistPath(media.id)));
      }
      attempts++;
    }

    res.status(202).json({ status: 'transcoding', message: 'Transcoding in progress, try again shortly' });
  } catch (err) {
    console.error('Transcode playlist error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// HLS segments
router.get('/:mediaId/transcode/:segment', (req: Request, res: Response) => {
  try {
    const mediaId = Number(req.params.mediaId);
    const segment = req.params.segment as string;

    // Validate segment name (only allow safe filenames)
    if (!/^segment\d+\.ts$/.test(segment)) {
      return res.status(400).json({ error: 'Invalid segment name' });
    }

    const segmentPath = getSegmentPath(mediaId, segment as string);
    if (!fs.existsSync(segmentPath)) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.setHeader('Content-Type', 'video/mp2t');
    res.sendFile(path.resolve(segmentPath));
  } catch (err) {
    console.error('Segment serving error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
