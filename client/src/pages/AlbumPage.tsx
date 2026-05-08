import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAlbum, getMedia } from '@/api/client';
import { useMedia } from '@/hooks/useMedia';
import MediaGrid from '@/components/MediaGrid';
import MediaViewer from '@/components/MediaViewer';
import SlideshowMode from '@/components/SlideshowMode';
import SortControls from '@/components/SortControls';
import { useTheme } from '@/contexts/ThemeContext';
import type { Album, MediaFile } from '@/types';

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const albumId = Number(id);
  const { theme } = useTheme();
  const [album, setAlbum] = useState<Album | null>(null);
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => {
    const saved = localStorage.getItem('stashy-per-page');
    return saved ? Number(saved) : 50;
  });
  const [viewerMedia, setViewerMedia] = useState<MediaFile | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideshowItems, setSlideshowItems] = useState<MediaFile[]>([]);
  const [slideshowLoading, setSlideshowLoading] = useState(false);

  const { items, total, totalPages, loading } = useMedia({
    albumId,
    sort,
    order,
    page,
    limit,
  });

  useEffect(() => {
    getAlbum(albumId).then(setAlbum).catch(() => {});
  }, [albumId]);

  const handleMediaClick = (_media: MediaFile, index: number) => {
    setViewerIndex(index);
    setViewerMedia(items[index]);
  };

  const startSlideshow = async () => {
    setSlideshowLoading(true);
    try {
      const PAGE_SIZE = 500;
      const first = await getMedia(albumId, { sort, order, page: 1, limit: PAGE_SIZE });
      let all = first.items;
      if (first.totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: first.totalPages - 1 }, (_, i) =>
            getMedia(albumId, { sort, order, page: i + 2, limit: PAGE_SIZE })
          )
        );
        all = all.concat(rest.flatMap(p => p.items));
      }
      setSlideshowItems(all);
      setShowSlideshow(true);
    } finally {
      setSlideshowLoading(false);
    }
  };

  const handleFavoriteToggle = (updated: MediaFile) => {
    const idx = items.findIndex(m => m.id === updated.id);
    if (idx !== -1) {
      items[idx] = updated;
      if (viewerMedia?.id === updated.id) setViewerMedia(updated);
    }
  };

  const controlStyle = {
    padding: '6px 12px',
    fontSize: '13px',
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    background: theme.surface,
    color: theme.text,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>{album?.name || 'Album'}</h1>
          <span className="text-sm" style={{ color: theme.text2 }}>{total} items</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SortControls sort={sort} order={order} onSortChange={setSort} onOrderChange={setOrder} />
          <select
            value={limit}
            onChange={(e) => { const v = Number(e.target.value); setLimit(v); setPage(1); localStorage.setItem('stashy-per-page', String(v)); }}
            style={controlStyle}
          >
            {[50, 100, 200, 300, 500].map(n => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
          {items.some(m => m.file_type === 'image') && (
            <button
              onClick={startSlideshow}
              disabled={slideshowLoading}
              style={{ ...controlStyle, background: theme.gradient, color: 'white', border: 'none', fontWeight: 600, opacity: slideshowLoading ? 0.7 : 1 }}
            >
              {slideshowLoading ? 'Loading…' : 'Slideshow'}
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16" style={{ color: theme.text2 }}>Loading...</div>
      ) : (
        <MediaGrid items={items} onMediaClick={handleMediaClick} onFavoriteToggle={handleFavoriteToggle} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...controlStyle, opacity: page === 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <span className="text-sm" style={{ color: theme.text2 }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ ...controlStyle, opacity: page === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}

      {/* Viewer */}
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
          onSlideshow={() => {
            setViewerMedia(null);
            startSlideshow();
          }}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}

      {/* Slideshow */}
      {showSlideshow && (
        <SlideshowMode items={slideshowItems} onClose={() => { setShowSlideshow(false); setSlideshowItems([]); }} />
      )}
    </div>
  );
}
