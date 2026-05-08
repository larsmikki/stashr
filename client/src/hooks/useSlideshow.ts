import { useState, useEffect, useCallback, useRef } from 'react';
import type { MediaFile } from '@/types';

function shuffled(indices: number[]): number[] {
  const a = [...indices];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface UseSlideshowOptions {
  items: MediaFile[];
  initialDelay?: number;
}

export function useSlideshow({ items, initialDelay = 5 }: UseSlideshowOptions) {
  const imageItems = items.filter(m => m.file_type === 'image');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [delay, setDelay] = useState(initialDelay);
  const [isRandom, setIsRandom] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Pre-shuffled queue of indices yet to be shown in random mode
  const shuffleQueueRef = useRef<number[]>([]);

  // Reset queue whenever items change or random mode toggles
  useEffect(() => {
    shuffleQueueRef.current = [];
  }, [imageItems.length, isRandom]);

  const next = useCallback(() => {
    if (isRandom && imageItems.length > 1) {
      setCurrentIndex(i => {
        // When queue is empty all images have been shown — reshuffle, excluding
        // the current image so the last and first of consecutive cycles differ.
        if (shuffleQueueRef.current.length === 0) {
          const all = Array.from({ length: imageItems.length }, (_, idx) => idx);
          shuffleQueueRef.current = shuffled(all.filter(idx => idx !== i));
        }
        return shuffleQueueRef.current.shift()!;
      });
    } else {
      setCurrentIndex(i => (i + 1) % imageItems.length);
    }
  }, [imageItems.length, isRandom]);

  const prev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + imageItems.length) % imageItems.length);
  }, [imageItems.length]);

  const togglePlay = useCallback(() => {
    setIsPlaying(p => !p);
  }, []);

  const toggleRandom = useCallback(() => {
    setIsRandom(r => !r);
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
    isRandom,
    toggleRandom,
  };
}
