import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/connection.js';

const SALT_ROUNDS = 10;
const SESSION_DURATION_DAYS = 30;

export function isPasswordSet(): boolean {
  const db = getDb();
  const result = db.exec(
    `SELECT value FROM settings WHERE key = 'password_hash'`,
  );
  return result.length > 0 && result[0].values.length > 0;
}

export async function setPassword(plainPassword: string): Promise<void> {
  const db = getDb();
  const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  db.run(
    `INSERT INTO settings (key, value) VALUES ('password_hash', $hash)
     ON CONFLICT(key) DO UPDATE SET value = $hash`,
    { $hash: hash },
  );
}

export async function verifyPassword(plainPassword: string): Promise<boolean> {
  const db = getDb();
  const result = db.exec(
    `SELECT value FROM settings WHERE key = 'password_hash'`,
  );
  if (!result.length || !result[0].values.length) return false;
  const hash = result[0].values[0][0] as string;
  return bcrypt.compare(plainPassword, hash);
}

export function removePassword(): void {
  const db = getDb();
  db.run(`DELETE FROM settings WHERE key = 'password_hash'`);
  db.run(`DELETE FROM sessions`);
}

export function createSession(): string {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  db.run(
    `INSERT INTO sessions (token, expires_at) VALUES ($token, $expires)`,
    { $token: token, $expires: expiresAt.toISOString() },
  );
  return token;
}

export function validateSession(token: string): boolean {
  const db = getDb();
  const result = db.exec(
    `SELECT token FROM sessions WHERE token = $token AND expires_at > datetime('now')`,
    { $token: token },
  );
  return result.length > 0 && result[0].values.length > 0;
}

export function cleanExpiredSessions(): void {
  const db = getDb();
  db.run(`DELETE FROM sessions WHERE expires_at <= datetime('now')`);
}
