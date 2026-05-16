import { useState, useEffect, useRef, useCallback } from 'react';
import { getFavorites } from '@/api/client';
import MediaGrid from '@/components/MediaGrid';
import SkeletonGrid from '@/components/SkeletonGrid';
import MediaViewer from '@/components/MediaViewer';
import SortControls from '@/components/SortControls';
import SelectionBar from '@/components/SelectionBar';
import { useSelection } from '@/hooks/useSelection';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errors';
import type { MediaFile } from '@/types';

const PAGE_SIZE = 100;

export default function FavoritesPage() {
  const { theme } = useTheme();
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');
  const [items, setItems] = useState<MediaFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewerMedia, setViewerMedia] = useState<MediaFile | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const selection = useSelection();
  const fetchToken = useRef(0);

  useEffect(() => {
    const token = ++fetchToken.current;
    setItems([]);
    setPage(1);
    setHasMore(false);
    setLoading(true);
    getFavorites({ sort, order, page: 1, limit: PAGE_SIZE })
      .then((data) => {
        if (token !== fetchToken.current) return;
        setItems(data.items);
        setTotal(data.total);
        setHasMore(data.page < data.totalPages);
      })
      .catch((err) => {
        if (token !== fetchToken.current) return;
        toast.error(getErrorMessage(err, 'Failed to load favorites'));
      })
      .finally(() => {
        if (token === fetchToken.current) setLoading(false);
      });
  }, [sort, order]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    const token = fetchToken.current;
    const next = page + 1;
    setLoading(true);
    try {
      const data = await getFavorites({ sort, order, page: next, limit: PAGE_SIZE });
      if (token !== fetchToken.current) return;
      setItems(prev => prev.concat(data.items));
      setPage(next);
      setHasMore(next < data.totalPages);
    } finally {
      if (token === fetchToken.current) setLoading(false);
    }
  }, [sort, order, page, hasMore, loading]);

  const handleMediaClick = (_media: MediaFile, index: number) => {
    setViewerIndex(index);
    setViewerMedia(items[index]);
  };

  const handleFavoriteToggle = (updated: MediaFile) => {
    if (!updated.is_favorite) {
      setItems(prev => prev.filter(m => m.id !== updated.id));
      setTotal(t => Math.max(0, t - 1));
      if (viewerMedia?.id === updated.id) setViewerMedia(null);
    } else {
      setItems(prev => prev.map(m => m.id === updated.id ? updated : m));
      if (viewerMedia?.id === updated.id) setViewerMedia(updated);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: theme.text }}>Favorites</h1>
          {!loading && <span className="text-sm" style={{ color: theme.text2 }}>{total} items</span>}
        </div>
        <SortControls sort={sort} order={order} onSortChange={setSort} onOrderChange={setOrder} />
      </div>

      {loading && items.length === 0 ? (
        <SkeletonGrid count={24} />
      ) : (
        <MediaGrid
          items={items}
          onMediaClick={handleMediaClick}
          onFavoriteToggle={handleFavoriteToggle}
          emptyMessage="No favorites yet. Click ★ on any image or video to add it."
          selection={selection}
          onEndReached={hasMore ? loadMore : undefined}
          loadingMore={loading && items.length > 0}
        />
      )}

      {viewerMedia && (
        <MediaViewer
          media={viewerMedia}
          items={items}
          currentIndex={viewerIndex}
          onClose={() => setViewerMedia(null)}
          onNavigate={(idx) => {
            setViewerIndex(idx);
            setViewerMedia(items[idx]);
          }}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}

      <SelectionBar ids={selection.ids} items={items} onClear={selection.clear} onMutate={handleFavoriteToggle} />
    </div>
  );
}
