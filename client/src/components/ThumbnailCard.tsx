import { useState } from 'react';
import { thumbnailUrl, toggleFavorite } from '@/api/client';
import { useTheme } from '@/contexts/ThemeContext';
import type { MediaFile } from '@/types';

interface Props {
  media: MediaFile;
  onClick: () => void;
  onFavoriteToggle?: (updated: MediaFile) => void;
  size?: 'sm' | 'md';
}

export default function ThumbnailCard({ media, onClick, onFavoriteToggle, size = 'md' }: Props) {
  const { theme } = useTheme();
  const sizeClass = size === 'sm' ? 'w-44 h-44' : 'w-full aspect-square';
  const [isFavorite, setIsFavorite] = useState(!!media.is_favorite);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await toggleFavorite(media.id);
      setIsFavorite(!!updated.is_favorite);
      onFavoriteToggle?.(updated);
    } catch {
      // silently ignore
    }
  };

  return (
    <button
      onClick={onClick}
      className={`${sizeClass} relative group overflow-hidden rounded-xl flex-shrink-0 cursor-pointer focus:outline-none card-hover`}
      style={{ background: theme.surface2 }}
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
      {/* Favorite button */}
      <button
        onClick={handleFavorite}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        className={`absolute top-1.5 right-1.5 z-10 p-1 rounded-full transition-all
          ${isFavorite
            ? 'opacity-100 bg-black/40 text-yellow-400'
            : 'opacity-0 group-hover:opacity-100 bg-black/40 text-white/80 hover:text-yellow-400'
          }`}
      >
        <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      </button>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{media.filename}</p>
      </div>
    </button>
  );
}
