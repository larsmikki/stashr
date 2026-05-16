import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

export interface ExecResult {
  columns: string[];
  values: unknown[][];
}

export interface CompatDb {
  raw: Database.Database;
  run(sql: string, params?: Record<string, unknown>): void;
  exec(sql: string, params?: Record<string, unknown>): ExecResult[];
  transaction<T>(fn: () => T): T;
}

let db: CompatDb | undefined;
const dbPath = path.join(config.dataDir, 'stash.db');

function stripPrefix(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(params)) {
    const name = k.startsWith('$') || k.startsWith('@') || k.startsWith(':') ? k.slice(1) : k;
    out[name] = params[k];
  }
  return out;
}

// Detect SQL with more than one statement (ignoring trailing semicolons and strings).
function isMultiStatement(sql: string): boolean {
  const stripped = sql.replace(/'(?:''|[^'])*'/g, '').replace(/--[^\n]*/g, '');
  const parts = stripped.split(';').map(s => s.trim()).filter(Boolean);
  return parts.length > 1;
}

export async function initDb(): Promise<CompatDb> {
  if (db) return db;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const raw = new Database(dbPath);
  raw.pragma('journal_mode = WAL');
  raw.pragma('synchronous = NORMAL');
  raw.pragma('foreign_keys = ON');

  db = {
    raw,

    run(sql, params) {
      if (!params) {
        if (isMultiStatement(sql)) {
          raw.exec(sql);
          return;
        }
        raw.prepare(sql).run();
        return;
      }
      raw.prepare(sql).run(stripPrefix(params));
    },

    exec(sql, params) {
      const stmt = raw.prepare(sql);
      if (!stmt.reader) {
        if (params) stmt.run(stripPrefix(params));
        else stmt.run();
        return [];
      }
      const rows = (params ? stmt.raw().all(stripPrefix(params)) : stmt.raw().all()) as unknown[][];
      if (!rows.length) return [];
      const columns = stmt.columns().map(c => c.name);
      return [{ columns, values: rows }];
    },

    transaction(fn) {
      return raw.transaction(fn)();
    },
  };

  return db;
}

export function getDb(): CompatDb {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

// Retained as a no-op for legacy call sites — better-sqlite3 persists synchronously.
export function saveDb(): void {
  // no-op
}

export function closeDb(): void {
  if (db) {
    db.raw.close();
    db = undefined;
  }
}
