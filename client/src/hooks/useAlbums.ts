import { useState, useEffect, useCallback } from 'react';
import { getAlbums } from '../api/client';
import { getErrorMessage } from '../utils/errors';
import type { Album } from '../types';

export function useAlbums() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAlbums();
      setAlbums(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load albums'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { albums, loading, error, refresh };
}
