import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, saveDb } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations(): void {
  const db = getDb();

  // Create migrations tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');

  // In production builds, migrations might be at a different path
  // Try both the source and dist locations
  let migrationFiles: string[] = [];
  if (fs.existsSync(migrationsDir)) {
    migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
  }

  for (const file of migrationFiles) {
    const [row] = db.exec(
      `SELECT name FROM _migrations WHERE name = $name`,
      { $name: file },
    );
    if (row && row.values.length > 0) continue;

    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.run(sql);
    db.run(`INSERT INTO _migrations (name) VALUES ($name)`, { $name: file });
  }

  saveDb();
}
