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

// Helper: set a password and return the token
async function setupPassword(password: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword: password }),
  });
  return (await res.json()).token as string;
}

describe('GET /api/auth/status', () => {
  it('returns passwordSet=false, authenticated=true when no password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/status`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ passwordSet: false, authenticated: true });
  });

  it('returns passwordSet=true, authenticated=false with no token', async () => {
    await setupPassword('secret');
    const res = await fetch(`${baseUrl}/api/auth/status`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ passwordSet: true, authenticated: false });
  });

  it('returns authenticated=true with a valid token', async () => {
    const token = await setupPassword('secret');
    const res = await fetch(`${baseUrl}/api/auth/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(await res.json()).toMatchObject({ passwordSet: true, authenticated: true });
  });
});

describe('POST /api/auth/password', () => {
  it('sets a new password and returns a token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: 'secret' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.token).toBe('string');
  });

  it('returns 400 when newPassword is missing', async () => {
    const res = await fetch(`${baseUrl}/api/auth/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token on correct password', async () => {
    await setupPassword('secret');
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'secret' }),
    });
    expect(res.status).toBe(200);
    expect(typeof (await res.json()).token).toBe('string');
  });

  it('returns 401 on wrong password', async () => {
    await setupPassword('secret');
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when password field is missing', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/auth/password', () => {
  it('removes password protection when authenticated with correct password', async () => {
    const token = await setupPassword('secret');

    const res = await fetch(`${baseUrl}/api/auth/password`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword: 'secret' }),
    });
    expect(res.status).toBe(200);

    const statusRes = await fetch(`${baseUrl}/api/auth/status`);
    expect((await statusRes.json()).passwordSet).toBe(false);
  });

  it('returns 400 when no password is set', async () => {
    const res = await fetch(`${baseUrl}/api/auth/password`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'anything' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth token', async () => {
    await setupPassword('secret');
    const res = await fetch(`${baseUrl}/api/auth/password`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'secret' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('auth middleware', () => {
  it('allows access to protected routes when no password is set', async () => {
    const res = await fetch(`${baseUrl}/api/albums`);
    expect(res.status).toBe(200);
  });

  it('blocks access to protected routes without a token when password is set', async () => {
    await setupPassword('secret');
    const res = await fetch(`${baseUrl}/api/albums`);
    expect(res.status).toBe(401);
  });

  it('allows access with a valid token', async () => {
    const token = await setupPassword('secret');
    const res = await fetch(`${baseUrl}/api/albums`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('allows access via query param token', async () => {
    const token = await setupPassword('secret');
    const res = await fetch(`${baseUrl}/api/albums?token=${token}`);
    expect(res.status).toBe(200);
  });
});
