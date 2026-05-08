import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db/connection.js';
import { getErrorMessage } from '../utils/db.js';

const router = Router();

function getSetting(key: string): string | null {
  const db = getDb();
  const result = db.exec('SELECT value FROM app_settings WHERE key = $key', { $key: key });
  if (!result.length || !result[0].values.length) return null;
  return result[0].values[0][0] as string;
}

function setSetting(key: string, value: string): void {
  const db = getDb();
  db.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES ($key, $value)', { $key: key, $value: value });
  saveDb();
}

router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const favoritesOnHome = getSetting('favorites_on_home') === '1';
    const favoritesSortOrder = Number(getSetting('favorites_sort_order') ?? '9999');
    const countResult = db.exec('SELECT COUNT(*) FROM media_files WHERE is_favorite = 1');
    const favoritesCount = countResult.length ? (countResult[0].values[0][0] as number) : 0;
    res.json({ favorites_on_home: favoritesOnHome, favorites_sort_order: favoritesSortOrder, favorites_count: favoritesCount });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to get settings') });
  }
});

router.put('/', (req: Request, res: Response) => {
  try {
    const { favorites_on_home, favorites_sort_order } = req.body;
    if (favorites_on_home !== undefined) {
      setSetting('favorites_on_home', favorites_on_home ? '1' : '0');
    }
    if (favorites_sort_order !== undefined) {
      setSetting('favorites_sort_order', String(favorites_sort_order));
    }
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to update settings') });
  }
});

export default router;
