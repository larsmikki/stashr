import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWall } from '@/api';
import MediaGrid from '@/components/MediaGrid';
import SkeletonGrid from '@/components/SkeletonGrid';
import MediaViewer from '@/components/MediaViewer';
import SelectionBar from '@/components/SelectionBar';
import { useSelection } from '@/hooks/useSelection';
import { queryKeys } from '@/queryKeys';
import type { MediaFile } from '@/types';

export default function WallPage() {
  const queryClient = useQueryClient();
  const [viewerMedia, setViewerMedia] = useState<MediaFile | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const selection = useSelection();

  const query = useQuery({ queryKey: queryKeys.wall, queryFn: getWall });
  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  const handleMediaClick = (_media: MediaFile, index: number) => {
    setViewerIndex(index);
    setViewerMedia(items[index]);
  };

  const handleFavoriteToggle = (updated: MediaFile) => {
    queryClient.setQueryData<{ items: MediaFile[] }>(queryKeys.wall, (current) => {
      if (!current) return current;
      return { items: current.items.map(item => item.id === updated.id ? updated : item) };
    });
    if (viewerMedia?.id === updated.id) setViewerMedia(updated);
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-text">Wall</h1>
        {!query.isLoading && <span className="text-sm text-text2">{items.length} items</span>}
      </div>

      {query.isLoading ? (
        <SkeletonGrid count={24} />
      ) : (
        <MediaGrid
          items={items}
          onMediaClick={handleMediaClick}
          onFavoriteToggle={handleFavoriteToggle}
          emptyMessage="No media found. Add some galleries first."
          selection={selection}
        />
      )}

      {viewerMedia && (
        <MediaViewer
          media={viewerMedia}
          items={items}
          currentIndex={viewerIndex}
          onClose={() => setViewerMedia(null)}
          onNavigate={(idx) => { setViewerIndex(idx); setViewerMedia(items[idx]); }}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}

      <SelectionBar ids={selection.ids} items={items} onClear={selection.clear} onMutate={handleFavoriteToggle} />
    </>
  );
}
