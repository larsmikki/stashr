import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: parseInt(process.env.PORT || '3011', 10),
  dataDir: process.env.DATA_DIR || path.join(__dirname, '../../data'),
  cacheDir: process.env.CACHE_DIR || path.join(__dirname, '../../cache'),
  thumbnailWidth: 300,
  thumbnailQuality: 80,
  defaultPageSize: 50,
  maxPageSize: 500,
  thumbsPerAlbumHome: 15,
  thumbnailConcurrency: 3,
};
