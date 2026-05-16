import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { search } from '@/api/client';
import MediaGrid from '@/components/MediaGrid';
import SkeletonGrid from '@/components/SkeletonGrid';
import MediaViewer from '@/components/MediaViewer';
import SelectionBar from '@/components/SelectionBar';
import { useSelection } from '@/hooks/useSelection';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errors';
import type { MediaFile, PaginatedResponse } from '@/types';

export default function SearchPage() {
  const { theme } = useTheme();
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const [data, setData] = useState<PaginatedResponse<MediaFile>>({ items: [], total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<MediaFile | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const selection = useSelection();

  useEffect(() => {
    if (!q) {
      setData({ items: [], total: 0, page: 1, totalPages: 0 });
      return;
    }
    setLoading(true);
    search({ q, limit: 200 })
      .then(setData)
      .catch((err) => {
        toast.error(getErrorMessage(err, 'Search failed'));
        setData({ items: [], total: 0, page: 1, totalPages: 0 });
      })
      .finally(() => setLoading(false));
  }, [q]);

  const handleFavoriteToggle = (updated: MediaFile) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(m => m.id === updated.id ? updated : m),
    }));
    if (viewerMedia?.id === updated.id) setViewerMedia(updated);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: theme.text }}>
            Search
          </h1>
          {q && !loading && (
            <span className="text-sm" style={{ color: theme.text2 }}>
              {data.total} result{data.total === 1 ? '' : 's'} for &ldquo;{q}&rdquo;
            </span>
          )}
        </div>
      </div>

      {!q ? (
        <p className="text-center py-12" style={{ color: theme.text2 }}>
          Type a query in the search bar above.
        </p>
      ) : loading ? (
        <SkeletonGrid count={24} />
      ) : (
        <MediaGrid
          items={data.items}
          onMediaClick={(_m, i) => { setViewerIndex(i); setViewerMedia(data.items[i]); }}
          onFavoriteToggle={handleFavoriteToggle}
          emptyMessage="No matches. Try a different query."
          selection={selection}
        />
      )}

      {viewerMedia && (
        <MediaViewer
          media={viewerMedia}
          items={data.items}
          currentIndex={viewerIndex}
          onClose={() => setViewerMedia(null)}
          onNavigate={(idx) => { setViewerIndex(idx); setViewerMedia(data.items[idx]); }}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}

      <SelectionBar ids={selection.ids} items={data.items} onClear={selection.clear} onMutate={handleFavoriteToggle} />
    </div>
  );
}
