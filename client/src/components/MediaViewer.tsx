import { useEffect, useCallback, type MouseEvent } from 'react';
import VideoPlayer from './VideoPlayer';
import { fullUrl } from '../api/client';
import { useSwipe } from '../hooks/useSwipe';
import type { MediaFile } from '../types';

interface Props {
  media: MediaFile;
  items: MediaFile[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onSlideshow?: () => void;
}

export default function MediaViewer({ media, items, currentIndex, onClose, onNavigate, onSlideshow }: Props) {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  const swipeRef = useSwipe<HTMLDivElement>({
    onSwipeLeft: useCallback(() => { if (hasNext) onNavigate(currentIndex + 1); }, [hasNext, onNavigate, currentIndex]),
    onSwipeRight: useCallback(() => { if (hasPrev) onNavigate(currentIndex - 1); }, [hasPrev, onNavigate, currentIndex]),
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        if (hasPrev) onNavigate(currentIndex - 1);
        break;
      case 'ArrowRight':
        if (hasNext) onNavigate(currentIndex + 1);
        break;
    }
  }, [onClose, onNavigate, currentIndex, hasPrev, hasNext]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const hasImages = items.some(m => m.file_type === 'image');

  const handleBackdropClick = useCallback((e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={handleBackdropClick}>
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close viewer"
        className="absolute top-4 right-4 z-10 text-white/80 hover:text-white p-2"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Slideshow button */}
      {hasImages && onSlideshow && (
        <button
          onClick={onSlideshow}
          aria-label="Start slideshow"
          className="absolute top-4 right-14 z-10 text-white/80 hover:text-white p-2"
          title="Start slideshow"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

      {/* Navigation arrows */}
      {hasPrev && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          aria-label="Previous image"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-white p-2 bg-black/30 rounded-full"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {hasNext && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          aria-label="Next image"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-white p-2 bg-black/30 rounded-full"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        {currentIndex + 1} / {items.length}
      </div>

      {/* Media content */}
      <div ref={swipeRef} className="flex items-center justify-center w-full h-full p-12" onClick={handleBackdropClick}>
        {media.file_type === 'image' ? (
          <img
            src={fullUrl(media.id)}
            alt={media.filename}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <VideoPlayer media={media} />
        )}
      </div>
    </div>
  );
}
