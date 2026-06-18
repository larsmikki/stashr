import { initDb, getDb } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { createApp } from './app.js';
import { config } from './config.js';
import { checkFfmpeg } from './services/thumbnail.service.js';
import { cleanExpiredSessions } from './services/auth.service.js';

async function main() {
  await initDb();
  runMigrations();
  console.log('Database initialized');

  // Check ffmpeg and reset failed video thumbnails if ffmpeg is now available
  const hasFfmpeg = await checkFfmpeg();
  if (hasFfmpeg) {
    const db = getDb();
    const result = db.exec(
      `SELECT COUNT(*) FROM media_files WHERE file_type = 'video' AND thumbnail_generated = 2`,
    );
    const failedCount = result.length ? (result[0].values[0][0] as number) : 0;
    if (failedCount > 0) {
      db.run(`UPDATE media_files SET thumbnail_generated = 0 WHERE file_type = 'video' AND thumbnail_generated = 2`);
      console.log(`Reset ${failedCount} failed video thumbnails for retry`);
    }
  }

  cleanExpiredSessions();

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Stashr server running on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
