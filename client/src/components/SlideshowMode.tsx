import { useEffect, useCallback } from 'react';
import { useSlideshow } from '../hooks/useSlideshow';
import { fullUrl } from '../api/client';
import { SLIDESHOW_MIN_DELAY_S, SLIDESHOW_MAX_DELAY_S } from '../constants';
import type { MediaFile } from '../types';

interface Props {
  items: MediaFile[];
  onClose: () => void;
}

export default function SlideshowMode({ items, onClose }: Props) {
  const { currentItem, currentIndex, total, isPlaying, delay, setDelay, next, prev, togglePlay } =
    useSlideshow({ items });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        prev();
        break;
      case 'ArrowRight':
        next();
        break;
    }
  }, [onClose, togglePlay, prev, next]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!currentItem || total === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center text-white">
        <p>No images available for slideshow.</p>
        <button onClick={onClose} className="ml-4 underline">Close</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-4">
        <img
          src={fullUrl(currentItem.id)}
          alt={currentItem.filename}
          className="max-h-full max-w-full object-contain transition-opacity duration-500"
          key={currentItem.id}
        />
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-4 py-4 bg-black/80">
        <button onClick={prev} aria-label="Previous image" className="text-white/80 hover:text-white p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button onClick={togglePlay} aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'} className="text-white/80 hover:text-white p-2">
          {isPlaying ? (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button onClick={next} aria-label="Next image" className="text-white/80 hover:text-white p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-white/60 text-sm ml-4">
          <span>Delay:</span>
          <input
            type="range"
            min={SLIDESHOW_MIN_DELAY_S}
            max={SLIDESHOW_MAX_DELAY_S}
            value={delay}
            onChange={e => setDelay(Number(e.target.value))}
            className="w-24 accent-white"
          />
          <span className="w-8">{delay}s</span>
        </div>

        <div className="text-white/60 text-sm ml-4">
          {currentIndex + 1} / {total}
        </div>

        <button onClick={onClose} aria-label="Close slideshow" className="text-white/80 hover:text-white p-2 ml-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
