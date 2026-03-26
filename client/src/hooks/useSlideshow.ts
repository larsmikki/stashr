import { useState, useEffect, useCallback, useRef } from 'react';
import type { MediaFile } from '../types';

interface UseSlideshowOptions {
  items: MediaFile[];
  initialDelay?: number;
}

export function useSlideshow({ items, initialDelay = 5 }: UseSlideshowOptions) {
  const imageItems = items.filter(m => m.file_type === 'image');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [delay, setDelay] = useState(initialDelay);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setCurrentIndex(i => (i + 1) % imageItems.length);
  }, [imageItems.length]);

  const prev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + imageItems.length) % imageItems.length);
  }, [imageItems.length]);

  const togglePlay = useCallback(() => {
    setIsPlaying(p => !p);
  }, []);

  useEffect(() => {
    if (isPlaying && imageItems.length > 1) {
      timerRef.current = setInterval(next, delay * 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, delay, next, imageItems.length]);

  return {
    currentItem: imageItems[currentIndex],
    currentIndex,
    total: imageItems.length,
    isPlaying,
    delay,
    setDelay,
    next,
    prev,
    togglePlay,
  };
}
