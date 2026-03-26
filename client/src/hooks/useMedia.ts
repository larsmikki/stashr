import { useState, useEffect, useCallback } from 'react';
import { getMedia } from '../api/client';
import { getErrorMessage } from '../utils/errors';
import type { MediaFile } from '../types';

interface UseMediaOptions {
  albumId: number;
  sort: string;
  order: string;
  page: number;
  limit?: number;
}

export function useMedia({ albumId, sort, order, page, limit = 50 }: UseMediaOptions) {
  const [items, setItems] = useState<MediaFile[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMedia(albumId, { sort, order, page, limit });
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load media'));
    } finally {
      setLoading(false);
    }
  }, [albumId, sort, order, page, limit]);

  useEffect(() => { refresh(); }, [refresh]);

  return { items, total, totalPages, loading, error, refresh };
}
