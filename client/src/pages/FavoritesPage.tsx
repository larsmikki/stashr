import { useState, useEffect, useCallback } from 'react';
import { getFavorites } from '@/api/client';
import MediaGrid from '@/components/MediaGrid';
import MediaViewer from '@/components/MediaViewer';
import SortControls from '@/components/SortControls';
import { useTheme } from '@/contexts/ThemeContext';
import type { MediaFile, PaginatedResponse } from '@/types';

export default function FavoritesPage() {
  const { theme } = useTheme();
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(() => {
    const saved = localStorage.getItem('stashy-per-page');
    return saved ? Number(saved) : 50;
  });
  const [data, setData] = useState<PaginatedResponse<MediaFile>>({ items: [], total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [viewerMedia, setViewerMedia] = useState<MediaFile | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    getFavorites({ sort, order, page, limit })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sort, order, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [sort, order]);

  const handleMediaClick = (_media: MediaFile, index: number) => {
    setViewerIndex(index);
    setViewerMedia(data.items[index]);
  };

  const handleFavoriteToggle = (updated: MediaFile) => {
    if (!updated.is_favorite) {
      setData(prev => {
        const items = prev.items.filter(m => m.id !== updated.id);
        const total = prev.total - 1;
        if (viewerMedia?.id === updated.id) setViewerMedia(null);
        return { ...prev, items, total };
      });
    } else {
      setData(prev => ({
        ...prev,
        items: prev.items.map(m => m.id === updated.id ? updated : m),
      }));
      if (viewerMedia?.id === updated.id) setViewerMedia(updated);
    }
  };

  const { items, total, totalPages } = data;

  const paginationBtnStyle = (disabled: boolean) => ({
    padding: '6px 12px',
    fontSize: '13px',
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    background: theme.surface,
    color: theme.text,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontFamily: 'inherit',
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Favorites</h1>
          {!loading && <span className="text-sm" style={{ color: theme.text2 }}>{total} items</span>}
        </div>
        <SortControls sort={sort} order={order} onSortChange={setSort} onOrderChange={setOrder} />
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: theme.text2 }}>Loading...</div>
      ) : (
        <MediaGrid
          items={items}
          onMediaClick={handleMediaClick}
          onFavoriteToggle={handleFavoriteToggle}
          emptyMessage="No favorites yet. Click ★ on any image or video to add it."
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={paginationBtnStyle(page === 1)}
          >
            Previous
          </button>
          <span className="text-sm" style={{ color: theme.text2 }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={paginationBtnStyle(page === totalPages)}
          >
            Next
          </button>
        </div>
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
    </div>
  );
}
