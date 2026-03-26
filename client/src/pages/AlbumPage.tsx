import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAlbum } from '../api/client';
import { useMedia } from '../hooks/useMedia';
import MediaGrid from '../components/MediaGrid';
import MediaViewer from '../components/MediaViewer';
import SlideshowMode from '../components/SlideshowMode';
import SortControls from '../components/SortControls';
import ScanButton from '../components/ScanButton';
import type { Album, MediaFile } from '../types';

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const albumId = Number(id);
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

  const { items, total, totalPages, loading, refresh } = useMedia({
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{album?.name || 'Album'}</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">{total} items</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SortControls sort={sort} order={order} onSortChange={setSort} onOrderChange={setOrder} />
          <select
            value={limit}
            onChange={(e) => { const v = Number(e.target.value); setLimit(v); setPage(1); localStorage.setItem('stashy-per-page', String(v)); }}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            {[50, 100, 200, 300, 500].map(n => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
          <ScanButton albumId={albumId} onComplete={refresh} />
          {items.some(m => m.file_type === 'image') && (
            <button
              onClick={() => setShowSlideshow(true)}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Slideshow
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : (
        <MediaGrid items={items} onMediaClick={handleMediaClick} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
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
            setShowSlideshow(true);
          }}
        />
      )}

      {/* Slideshow */}
      {showSlideshow && (
        <SlideshowMode items={items} onClose={() => setShowSlideshow(false)} />
      )}
    </div>
  );
}
