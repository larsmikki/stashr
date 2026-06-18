import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import type { CompatDb as Database } from '../src/db/connection.js';
import os from 'os';
import fs from 'fs';
import path from 'path';
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
const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  tmpDirs.push(dir);
  return dir;
}

beforeAll(async () => {
  const app = createApp();
  server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  await new Promise<void>((resolve, reject) =>
    server.close(err => (err ? reject(err) : resolve()))
  );
});

beforeEach(async () => {
  dbRef.current = await createTestDb();
});

// Helper: create an album and return the response body
async function createAlbum(name: string, dirPath: string) {
  const res = await fetch(`${baseUrl}/api/albums`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, path: dirPath }),
  });
  return { status: res.status, body: await res.json() };
}

describe('GET /api/albums', () => {
  it('returns empty array with no albums', async () => {
    const res = await fetch(`${baseUrl}/api/albums`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns created albums', async () => {
    const dir = makeTmpDir();
    await createAlbum('Vacation', dir);
    const res = await fetch(`${baseUrl}/api/albums`);
    const albums = await res.json();
    expect(albums).toHaveLength(1);
    expect(albums[0].name).toBe('Vacation');
  });
});

describe('POST /api/albums', () => {
  it('creates an album with a valid directory path', async () => {
    const dir = makeTmpDir();
    const { status, body } = await createAlbum('My Album', dir);
    expect(status).toBe(201);
    expect(body.name).toBe('My Album');
    expect(body.id).toBeTypeOf('number');
    expect(body.scan_status).toBe('idle');
  });

  it('returns 400 when name is missing', async () => {
    const res = await fetch(`${baseUrl}/api/albums`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/tmp' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when path is missing', async () => {
    const res = await fetch(`${baseUrl}/api/albums`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when path does not exist on disk', async () => {
    const { status } = await createAlbum('Test', '/nonexistent/path-xyz-abc');
    expect(status).toBe(400);
  });
});

describe('GET /api/albums/:id', () => {
  it('returns the album by ID', async () => {
    const dir = makeTmpDir();
    const { body: created } = await createAlbum('Summer', dir);

    const res = await fetch(`${baseUrl}/api/albums/${created.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(created.id);
    expect(body.name).toBe('Summer');
  });

  it('returns 404 for a non-existent album ID', async () => {
    const res = await fetch(`${baseUrl}/api/albums/99999`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/albums/:id', () => {
  it('updates the album name', async () => {
    const dir = makeTmpDir();
    const { body: created } = await createAlbum('Old Name', dir);

    const res = await fetch(`${baseUrl}/api/albums/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe('New Name');
  });
});

describe('DELETE /api/albums/:id', () => {
  it('deletes an album and returns 204', async () => {
    const dir = makeTmpDir();
    const { body: created } = await createAlbum('ToDelete', dir);

    const delRes = await fetch(`${baseUrl}/api/albums/${created.id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(204);

    const getRes = await fetch(`${baseUrl}/api/albums/${created.id}`);
    expect(getRes.status).toBe(404);
  });
});

describe('PUT /api/albums/reorder', () => {
  it('reorders albums by ID array', async () => {
    const dir1 = makeTmpDir();
    const dir2 = makeTmpDir();
    const { body: a1 } = await createAlbum('Alpha', dir1);
    const { body: a2 } = await createAlbum('Beta', dir2);

    const res = await fetch(`${baseUrl}/api/albums/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ albumIds: [a2.id, a1.id] }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });

  it('returns 400 when albumIds is not an array of numbers', async () => {
    const res = await fetch(`${baseUrl}/api/albums/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ albumIds: 'bad' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/albums/:id/scan-status', () => {
  it('returns idle status for a newly created album', async () => {
    const dir = makeTmpDir();
    const { body: created } = await createAlbum('Fresh', dir);

    const res = await fetch(`${baseUrl}/api/albums/${created.id}/scan-status`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('idle');
    expect(body.file_count).toBe(0);
  });
});
