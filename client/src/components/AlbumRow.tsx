import { Link } from 'react-router-dom';
import ThumbnailCard from './ThumbnailCard';
import type { HomeAlbum, MediaFile } from '../types';

interface Props {
  album: HomeAlbum;
  onMediaClick: (media: MediaFile, allMedia: MediaFile[]) => void;
}

export default function AlbumRow({ album, onMediaClick }: Props) {
  if (!album.media.length) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <Link
          to={`/albums/${album.id}`}
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {album.name}
        </Link>
        <Link
          to={`/albums/${album.id}`}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          View all
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {album.media.map(media => (
          <ThumbnailCard
            key={media.id}
            media={media}
            size="sm"
            onClick={() => onMediaClick(media, album.media)}
          />
        ))}
      </div>
    </div>
  );
}
