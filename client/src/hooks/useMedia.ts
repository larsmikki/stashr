import { useState, useEffect, useCallback, useRef } from 'react';
import { getMedia } from '@/api/client';
import { getErrorMessage } from '@/utils/errors';
import type { MediaFile } from '@/types';

interface UseMediaOptions {
  albumId: number;
  sort: string;
  order: string;
  limit?: number;
}

// Infinite-scroll-friendly media loader. Items accumulate across page fetches;
// the list resets whenever the query key (album/sort/order/limit) changes.
export function useMedia({ albumId, sort, order, limit = 100 }: UseMediaOptions) {
  const [items, setItems] = useState<MediaFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Token used to ignore in-flight responses from a previous query key.
  const fetchToken = useRef(0);

  useEffect(() => {
    const token = ++fetchToken.current;
    setItems([]);
    setPage(1);
    setHasMore(false);
    setLoading(true);
    setError(null);

    getMedia(albumId, { sort, order, page: 1, limit })
      .then((data) => {
        if (token !== fetchToken.current) return;
        setItems(data.items);
        setTotal(data.total);
        setHasMore(data.page < data.totalPages);
      })
      .catch((err) => {
        if (token !== fetchToken.current) return;
        setError(getErrorMessage(err, 'Failed to load media'));
      })
      .finally(() => {
        if (token !== fetchToken.current) return;
        setLoading(false);
      });
  }, [albumId, sort, order, limit]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    const token = fetchToken.current;
    const next = page + 1;
    setLoading(true);
    try {
      const data = await getMedia(albumId, { sort, order, page: next, limit });
      if (token !== fetchToken.current) return;
      setItems(prev => prev.concat(data.items));
      setPage(next);
      setHasMore(next < data.totalPages);
    } catch (err) {
      if (token !== fetchToken.current) return;
      setError(getErrorMessage(err, 'Failed to load more media'));
    } finally {
      if (token === fetchToken.current) setLoading(false);
    }
  }, [albumId, sort, order, limit, page, hasMore, loading]);

  const mutate = useCallback((updated: MediaFile) => {
    setItems(prev => prev.map(m => m.id === updated.id ? updated : m));
  }, []);

  const remove = useCallback((id: number) => {
    setItems(prev => prev.filter(m => m.id !== id));
    setTotal(t => Math.max(0, t - 1));
  }, []);

  return { items, total, hasMore, loading, error, loadMore, mutate, remove };
}
