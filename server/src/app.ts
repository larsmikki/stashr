import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import albumsRouter from './routes/albums.js';
import mediaRouter from './routes/media.js';
import thumbnailsRouter from './routes/thumbnails.js';
import streamingRouter from './routes/streaming.js';
import homeRouter from './routes/home.js';
import filesystemRouter from './routes/filesystem.js';
import authRouter from './routes/auth.js';
import favoritesRouter from './routes/favorites.js';
import settingsRouter from './routes/settings.js';
import bulkRouter from './routes/bulk.js';
import wallRouter from './routes/wall.js';
import { authMiddleware } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  const isProduction = process.env.NODE_ENV === 'production';

  app.use(compression());
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Auth routes (before middleware so they're always accessible)
  app.use('/api/auth', authRouter);

  // Auth middleware (protects all subsequent API routes)
  app.use('/api', authMiddleware);

  // API routes
  app.use('/api/albums', albumsRouter);
  app.use('/api/albums', mediaRouter);
  app.use('/api/thumbnails', thumbnailsRouter);
  app.use('/api/media', streamingRouter);
  app.use('/api/home', homeRouter);
  app.use('/api/filesystem', filesystemRouter);
  app.use('/api', favoritesRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api', bulkRouter);
  app.use('/api/wall', wallRouter);

  // In production, serve the client build
  if (isProduction) {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
