import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import type { CompatDb as Database } from '../src/db/connection.js';
import { createTestDb } from './helpers/testDb.js';

const dbRef = vi.hoisted(() => ({ current: null as Database | null }));

vi.mock('../src/db/connection.js', () => ({
  getDb: () => dbRef.current,
  saveDb: vi.fn(),
  initDb: vi.fn(),
}));

vi.mock('morgan', () => ({
  default: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

import { createApp } from '../src/app.js';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp();
  server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close(err => (err ? reject(err) : resolve()))
  );
});

beforeEach(async () => {
  dbRef.current = await createTestDb();
});

// Insert a test album (once) and return its ID
function seedAlbum(db: Database): number {
  const existing = db.exec(`SELECT id FROM albums WHERE path = '/tmp/test-album'`);
  if (existing.length && existing[0].values.length) {
    return existing[0].values[0][0] as number;
  }
  db.run(`INSERT INTO albums (name, path, sort_order) VALUES ('Test Album', '/tmp/test-album', 1)`);
  return (db.exec('SELECT last_insert_rowid()')[0].values[0][0]) as number;
}

// Insert a media file under the shared test album and return the media ID
function seedMedia(db: Database, overrides: { filePath?: string; filename?: string } = {}): number {
  const albumId = seedAlbum(db);
  const filePath = overrides.filePath ?? '/tmp/test-album/photo.jpg';
  const filename = overrides.filename ?? 'photo.jpg';

  db.run(
    `INSERT INTO media_files
       (album_id, file_path, relative_path, filename, file_type, file_size, mime_type, modified_at)
     VALUES
       ($albumId, $filePath, $filename, $filename, 'image', 1024, 'image/jpeg', datetime('now'))`,
    { $albumId: albumId, $filePath: filePath, $filename: filename },
  );
  return (db.exec('SELECT last_insert_rowid()')[0].values[0][0]) as number;
}

describe('GET /api/favorites', () => {
  it('returns empty list when no favorites exist', async () => {
    const res = await fetch(`${baseUrl}/api/favorites`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
  });

  it('returns favorited media items', async () => {
    const mediaId = seedMedia(dbRef.current!);
    await fetch(`${baseUrl}/api/media/${mediaId}/favorite`, { method: 'PUT' });

    const res = await fetch(`${baseUrl}/api/favorites`);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe(mediaId);
    expect(body.items[0].is_favorite).toBe(1);
  });

  it('excludes non-favorited items from results', async () => {
    const id1 = seedMedia(dbRef.current!, { filePath: '/tmp/test-album/a.jpg', filename: 'a.jpg' });
    seedMedia(dbRef.current!, { filePath: '/tmp/test-album/b.jpg', filename: 'b.jpg' });

    // Only favorite the first one
    await fetch(`${baseUrl}/api/media/${id1}/favorite`, { method: 'PUT' });

    const res = await fetch(`${baseUrl}/api/favorites`);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe(id1);
  });

  it('respects pagination params', async () => {
    const res = await fetch(`${baseUrl}/api/favorites?page=1&limit=10`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(1);
    expect(body.totalPages).toBe(0);
  });
});

describe('PUT /api/media/:id/favorite', () => {
  it('sets is_favorite to 1 on first toggle', async () => {
    const mediaId = seedMedia(dbRef.current!);
    const res = await fetch(`${baseUrl}/api/media/${mediaId}/favorite`, { method: 'PUT' });
    expect(res.status).toBe(200);
    expect((await res.json()).is_favorite).toBe(1);
  });

  it('sets is_favorite back to 0 on second toggle', async () => {
    const mediaId = seedMedia(dbRef.current!);
    await fetch(`${baseUrl}/api/media/${mediaId}/favorite`, { method: 'PUT' });
    const res = await fetch(`${baseUrl}/api/media/${mediaId}/favorite`, { method: 'PUT' });
    expect((await res.json()).is_favorite).toBe(0);
  });

  it('returns 404 for a non-existent media ID', async () => {
    const res = await fetch(`${baseUrl}/api/media/99999/favorite`, { method: 'PUT' });
    expect(res.status).toBe(404);
  });
});
