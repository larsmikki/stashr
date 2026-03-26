import ThumbnailCard from './ThumbnailCard';
import type { MediaFile } from '../types';

interface Props {
  items: MediaFile[];
  onMediaClick: (media: MediaFile, index: number) => void;
}

export default function MediaGrid({ items, onMediaClick }: Props) {
  if (!items.length) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-12">
        No media found. Try scanning this album first.
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
        />
      ))}
    </div>
  );
}
