import { forwardRef, useRef } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import ThumbnailCard from '@/components/ThumbnailCard';
import { useTheme } from '@/contexts/ThemeContext';
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

export default function MediaGrid({ items, onMediaClick, onFavoriteToggle, emptyMessage, selection, onEndReached, loadingMore }: Props) {
  const { theme } = useTheme();
  const anchorRef = useRef<number | null>(null);

  if (!items.length) {
    return (
      <p className="text-center py-12" style={{ color: theme.text2 }}>
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
            />
          );
        }}
      />
      {loadingMore && (
        <p className="text-center py-4" style={{ color: theme.text2 }}>Loading more…</p>
      )}
    </>
  );
}
