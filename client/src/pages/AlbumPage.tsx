import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAlbum, getMedia } from '@/api/client';
import { useMedia } from '@/hooks/useMedia';
import { useSelection } from '@/hooks/useSelection';
import MediaGrid from '@/components/MediaGrid';
import SkeletonGrid from '@/components/SkeletonGrid';
import MediaViewer from '@/components/MediaViewer';
import SlideshowMode from '@/components/SlideshowMode';
import SortControls from '@/components/SortControls';
import SelectionBar from '@/components/SelectionBar';
import { useTheme } from '@/contexts/ThemeContext';
import type { Album, MediaFile } from '@/types';

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const albumId = Number(id);
  const { theme } = useTheme();
  const [album, setAlbum] = useState<Album | null>(null);
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');
  const [viewerMedia, setViewerMedia] = useState<MediaFile | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideshowItems, setSlideshowItems] = useState<MediaFile[]>([]);
  const [slideshowLoading, setSlideshowLoading] = useState(false);

  const selection = useSelection();
  const { items, total, loading, hasMore, loadMore, mutate } = useMedia({
    albumId,
    sort,
    order,
    limit: 100,
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
    mutate(updated);
    if (viewerMedia?.id === updated.id) setViewerMedia(updated);
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: theme.text }}>{album?.name || 'Album'}</h1>
          <span className="text-sm" style={{ color: theme.text2 }}>{total} items</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SortControls sort={sort} order={order} onSortChange={setSort} onOrderChange={setOrder} />
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

      {loading && items.length === 0 ? (
        <SkeletonGrid count={24} />
      ) : (
        <MediaGrid
          items={items}
          onMediaClick={handleMediaClick}
          onFavoriteToggle={handleFavoriteToggle}
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
          onSlideshow={() => {
            setViewerMedia(null);
            startSlideshow();
          }}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}

      {showSlideshow && (
        <SlideshowMode items={slideshowItems} onClose={() => { setShowSlideshow(false); setSlideshowItems([]); }} />
      )}

      <SelectionBar ids={selection.ids} items={items} onClear={selection.clear} onMutate={mutate} />
    </div>
  );
}
