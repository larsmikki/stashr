import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CompatDb as Database } from '../src/db/connection.js';
import { createTestDb } from './helpers/testDb.js';

// vi.hoisted ensures dbRef is available inside the vi.mock factory (which is hoisted before imports)
const dbRef = vi.hoisted(() => ({ current: null as Database | null }));

vi.mock('../src/db/connection.js', () => ({
  getDb: () => dbRef.current,
  saveDb: vi.fn(),
  initDb: vi.fn(),
}));

import {
  isPasswordSet,
  setPassword,
  verifyPassword,
  createSession,
  validateSession,
  removePassword,
  cleanExpiredSessions,
} from '../src/services/auth.service.js';

beforeEach(async () => {
  dbRef.current = await createTestDb();
});

describe('isPasswordSet', () => {
  it('returns false on a fresh DB', () => {
    expect(isPasswordSet()).toBe(false);
  });

  it('returns true after setting a password', async () => {
    await setPassword('hunter2');
    expect(isPasswordSet()).toBe(true);
  });
});

describe('setPassword / verifyPassword', () => {
  it('verifies the correct password', async () => {
    await setPassword('mysecret');
    expect(await verifyPassword('mysecret')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    await setPassword('mysecret');
    expect(await verifyPassword('wrong')).toBe(false);
  });

  it('returns false when no password is set', async () => {
    expect(await verifyPassword('anything')).toBe(false);
  });

  it('overwrites the existing password hash on second call', async () => {
    await setPassword('first');
    await setPassword('second');
    expect(await verifyPassword('first')).toBe(false);
    expect(await verifyPassword('second')).toBe(true);
  });
});

describe('createSession / validateSession', () => {
  it('returns a non-empty hex string token', () => {
    const token = createSession();
    expect(typeof token).toBe('string');
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('validates a freshly created session', () => {
    const token = createSession();
    expect(validateSession(token)).toBe(true);
  });

  it('rejects an unknown token', () => {
    expect(validateSession('not-a-real-token')).toBe(false);
  });

  it('rejects an empty string token', () => {
    expect(validateSession('')).toBe(false);
  });
});

describe('removePassword', () => {
  it('clears the password hash', async () => {
    await setPassword('pass');
    removePassword();
    expect(isPasswordSet()).toBe(false);
  });

  it('invalidates all sessions', async () => {
    await setPassword('pass');
    const token = createSession();
    expect(validateSession(token)).toBe(true);
    removePassword();
    expect(validateSession(token)).toBe(false);
  });
});

describe('cleanExpiredSessions', () => {
  it('removes expired sessions and keeps valid ones', () => {
    const db = dbRef.current!;
    db.run(`INSERT INTO sessions (token, expires_at) VALUES ('expired-tok', datetime('now', '-1 day'))`);
    db.run(`INSERT INTO sessions (token, expires_at) VALUES ('valid-tok', datetime('now', '+30 days'))`);

    cleanExpiredSessions();

    expect(validateSession('expired-tok')).toBe(false);
    expect(validateSession('valid-tok')).toBe(true);
  });
});
