import { thumbnailUrl, fullUrl, streamUrl, toggleFavorite } from '@/api';
import { getErrorMessage } from '@/utils/errors';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui';
import type { MediaFile } from '@/types';

interface Props {
  media: MediaFile;
  onClick: () => void;
  onFavoriteToggle?: (updated: MediaFile) => void;
  size?: 'sm' | 'md';
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number, withRange: boolean) => void;
  useOriginals?: boolean;
}

export default function ThumbnailCard({
  media,
  onClick,
  onFavoriteToggle,
  size = 'md',
  selectable = false,
  selected = false,
  onToggleSelect,
  useOriginals = false,
}: Props) {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const sizeClass = size === 'sm' ? 'w-44 h-44' : 'w-full aspect-square';
  const isFavorite = !!media.is_favorite;

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await toggleFavorite(media.id);
      onFavoriteToggle?.(updated);
    } catch (err) {
      addToast(getErrorMessage(err, 'Could not update favorite'), 'error');
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectable && onToggleSelect && (e.ctrlKey || e.metaKey || e.shiftKey || selected)) {
      e.preventDefault();
      onToggleSelect(media.id, e.shiftKey);
      return;
    }
    // ctrl/meta/shift: let the <a href> open natively (new tab / new window)
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    onClick();
  };

  const handleSelectIcon = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(media.id, e.shiftKey);
  };

  return (
    <div className={`${sizeClass} relative group flex-shrink-0`}>
      <a
        href={media.file_type === 'video' ? streamUrl(media.id) : fullUrl(media.id)}
        onClick={handleCardClick}
        className={`absolute inset-0 overflow-hidden rounded-xl cursor-pointer focus:outline-none card-hover bg-surface2 no-underline ${selected ? 'outline-3 outline-accent' : ''}`}
      >
        <img
          src={useOriginals ? fullUrl(media.id) : thumbnailUrl(media.id)}
          alt={media.filename}
          loading="lazy"
          onError={(e) => {
            if (useOriginals) {
              const img = e.currentTarget;
              img.onerror = null;
              img.src = thumbnailUrl(media.id);
            }
          }}
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
      </a>

      {/* Selection checkbox — sibling of <a> so clicks don't bubble into it */}
      {selectable && (
        <button
          onClick={handleSelectIcon}
          aria-label={selected ? 'Deselect' : 'Select'}
          className={`absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all
            ${selected
              ? 'opacity-100 text-white'
              : 'opacity-0 group-hover:opacity-100 bg-black/40 text-white/80'}`}
          style={selected ? { background: theme.accent } : undefined}
        >
          {selected ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
        </button>
      )}

      {/* Favorite button — sibling of <a> so clicks don't bubble into it */}
      <button
        onClick={handleFavorite}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        className={`absolute top-1.5 right-1.5 z-10 p-1 rounded-full transition-opacity
          ${isFavorite
            ? 'opacity-100 bg-black/40'
            : 'opacity-0 group-hover:opacity-100 bg-black/40 text-white/80 hover:opacity-90'
          }`}
        style={isFavorite ? { color: theme.accent } : undefined}
      >
        <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      </button>
    </div>
  );
}
