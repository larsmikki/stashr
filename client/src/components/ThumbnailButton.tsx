import { useState, useEffect, useRef } from 'react';
import { generateThumbnails, getThumbnailStatus } from '@/api/client';
import { SCAN_POLL_INTERVAL_MS } from '@/constants';
import type { ThumbnailStatus } from '@/types';

interface Props {
  albumId: number;
  size?: 'sm' | 'md';
}

export default function ThumbnailButton({ albumId, size = 'sm' }: Props) {
  const [status, setStatus] = useState<ThumbnailStatus | null>(null);
  const [generating, setGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getThumbnailStatus(albumId).then(s => {
      setStatus(s);
      if (s.generating) {
        setGenerating(true);
        startPolling();
      }
    }).catch(() => {});

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [albumId]);

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const s = await getThumbnailStatus(albumId);
        setStatus(s);
        if (!s.generating) {
          setGenerating(false);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        setGenerating(false);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, SCAN_POLL_INTERVAL_MS);
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await generateThumbnails(albumId);
      startPolling();
    } catch {
      setGenerating(false);
    }
  };

  const allDone = status ? status.total > 0 && status.pending === 0 && status.failed === 0 : false;

  if (status && status.total === 0) return null;

  const btnClass = size === 'sm'
    ? `settings-action-btn ${allDone ? '' : 'settings-action-btn-purple'}`
    : '';

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={handleGenerate}
        disabled={generating || allDone}
        title={
          allDone
            ? 'All thumbnails generated'
            : generating
            ? 'Generating thumbnails...'
            : `Generate thumbnails (${status?.pending ?? 0} pending, ${status?.failed ?? 0} failed)`
        }
        className={`${btnClass} inline-flex items-center gap-1`}
        style={allDone ? { background: 'var(--settings-surface2, #f3f4f6)', color: 'var(--settings-text2, #6b7084)' } : undefined}
      >
        {generating ? (
          <>
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {status ? `${status.completed}/${status.total}` : 'Generating...'}
          </>
        ) : allDone ? (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Thumbs
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Thumbs
          </>
        )}
      </button>
    </div>
  );
}
