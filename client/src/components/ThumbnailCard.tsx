import { thumbnailUrl } from '../api/client';
import type { MediaFile } from '../types';

interface Props {
  media: MediaFile;
  onClick: () => void;
  size?: 'sm' | 'md';
}

export default function ThumbnailCard({ media, onClick, size = 'md' }: Props) {
  const sizeClass = size === 'sm' ? 'w-44 h-44' : 'w-full aspect-square';

  return (
    <button
      onClick={onClick}
      className={`${sizeClass} relative group overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500`}
    >
      <img
        src={thumbnailUrl(media.id)}
        alt={media.filename}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
      {media.file_type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.34-5.89a1.5 1.5 0 000-2.54L6.3 2.84z" />
            </svg>
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{media.filename}</p>
      </div>
    </button>
  );
}
