import { forwardRef, useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VirtuosoGrid } from 'react-virtuoso';
import ThumbnailCard from '@/components/ThumbnailCard';
import { getSettings } from '@/api';
import { queryKeys } from '@/queryKeys';
import type { MediaFile } from '@/types';

interface Props {
  items: MediaFile[];
  onMediaClick: (media: MediaFile, index: number) => void;
  onFavoriteToggle?: (updated: MediaFile) => void;
  emptyMessage?: string;
  selection?: {
    ids: Set<number>;
    toggle: (id: number) => void;
    selectMany: (ids: number[]) => void;
  };
  onEndReached?: () => void;
  loadingMore?: boolean;
}

const ListContainer = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function ListContainer(props, ref) {
    return (
      <div
        ref={ref}
        {...props}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3"
      />
    );
  },
);

const ItemContainer = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} style={{ ...props.style, display: 'flex' }} />
);

const ORIGINALS_KEY = 'gallery-originals';

export default function MediaGrid({ items, onMediaClick, onFavoriteToggle, emptyMessage, selection, onEndReached, loadingMore }: Props) {
  const anchorRef = useRef<number | null>(null);
  const { data: settings } = useQuery({ queryKey: queryKeys.settings, queryFn: getSettings });
  const [useOriginals, setUseOriginals] = useState<boolean>(() =>
    localStorage.getItem(ORIGINALS_KEY) === 'true'
  );

  useEffect(() => {
    if (settings?.gallery_use_originals !== undefined) {
      const val = settings.gallery_use_originals;
      setUseOriginals(val);
      localStorage.setItem(ORIGINALS_KEY, val ? 'true' : 'false');
    }
  }, [settings?.gallery_use_originals]);

  if (!items.length) {
    return (
      <p className="text-center py-12 text-text2">
        {emptyMessage ?? 'No media found. Try scanning this album first.'}
      </p>
    );
  }

  const handleToggleSelect = (id: number, withRange: boolean) => {
    if (!selection) return;
    const idx = items.findIndex(m => m.id === id);
    if (withRange && anchorRef.current !== null && idx !== -1) {
      const [lo, hi] = anchorRef.current < idx ? [anchorRef.current, idx] : [idx, anchorRef.current];
      const rangeIds = items.slice(lo, hi + 1).map(m => m.id);
      selection.selectMany(rangeIds);
      return;
    }
    anchorRef.current = idx;
    selection.toggle(id);
  };

  return (
    <>
      <VirtuosoGrid
        useWindowScroll
        totalCount={items.length}
        components={{ List: ListContainer, Item: ItemContainer }}
        endReached={onEndReached}
        overscan={600}
        itemContent={(index) => {
          const media = items[index];
          if (!media) return null;
          return (
            <ThumbnailCard
              media={media}
              onClick={() => onMediaClick(media, index)}
              onFavoriteToggle={onFavoriteToggle}
              selectable={!!selection}
              selected={selection?.ids.has(media.id)}
              onToggleSelect={handleToggleSelect}
              useOriginals={useOriginals}
            />
          );
        }}
      />
      {loadingMore && (
        <p className="text-center py-4 text-text2">Loading more…</p>
      )}
    </>
  );
}
