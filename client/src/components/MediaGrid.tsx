import ThumbnailCard from '@/components/ThumbnailCard';
import { useTheme } from '@/contexts/ThemeContext';
import type { MediaFile } from '@/types';

interface Props {
  items: MediaFile[];
  onMediaClick: (media: MediaFile, index: number) => void;
  onFavoriteToggle?: (updated: MediaFile) => void;
  emptyMessage?: string;
}

export default function MediaGrid({ items, onMediaClick, onFavoriteToggle, emptyMessage }: Props) {
  const { theme } = useTheme();
  if (!items.length) {
    return (
      <p className="text-center py-12" style={{ color: theme.text2 }}>
        {emptyMessage ?? 'No media found. Try scanning this album first.'}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
      {items.map((media, index) => (
        <ThumbnailCard
          key={media.id}
          media={media}
          onClick={() => onMediaClick(media, index)}
          onFavoriteToggle={onFavoriteToggle}
        />
      ))}
    </div>
  );
}
