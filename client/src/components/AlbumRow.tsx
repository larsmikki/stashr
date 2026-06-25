import { Link } from 'react-router-dom';
import ThumbnailCard from '@/components/ThumbnailCard';
import type { HomeAlbum, MediaFile } from '@/types';

interface Props {
  album: HomeAlbum;
  onMediaClick: (media: MediaFile, allMedia: MediaFile[]) => void;
  onFavoriteToggle?: (updated: MediaFile) => void;
}

export default function AlbumRow({ album, onMediaClick, onFavoriteToggle }: Props) {
  if (!album.media.length) return null;

  const href = album.is_favorites ? '/favorites' : `/albums/${album.id}`;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <Link
          to={href}
          className="text-lg font-semibold flex items-center gap-2 transition-opacity hover:opacity-80 text-text"
        >
          {album.is_favorites && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          )}
          {album.name}
        </Link>
        <Link
          to={href}
          className="text-sm font-medium transition-opacity hover:opacity-80 text-accent"
        >
          View all
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {album.media.map(media => (
          <ThumbnailCard
            key={media.id}
            media={media}
            size="sm"
            onClick={() => onMediaClick(media, album.media)}
            onFavoriteToggle={onFavoriteToggle}
          />
        ))}
      </div>
    </div>
  );
}
