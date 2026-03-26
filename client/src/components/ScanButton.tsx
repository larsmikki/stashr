import { useState, useEffect, useRef } from 'react';
import { scanAlbum, getScanStatus } from '../api/client';
import { SCAN_POLL_INTERVAL_MS } from '../constants';

interface Props {
  albumId: number;
  onComplete?: () => void;
  size?: 'sm' | 'md';
}

export default function ScanButton({ albumId, onComplete, size = 'md' }: Props) {
  const [scanning, setScanning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startScan = async () => {
    try {
      setScanning(true);
      await scanAlbum(albumId);

      // Poll for completion
      pollRef.current = setInterval(async () => {
        try {
          const status = await getScanStatus(albumId);
          if (status.status !== 'scanning') {
            setScanning(false);
            if (pollRef.current) clearInterval(pollRef.current);
            onComplete?.();
          }
        } catch {
          setScanning(false);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, SCAN_POLL_INTERVAL_MS);
    } catch {
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const sizeClass = size === 'sm'
    ? 'px-2 py-1 text-xs'
    : 'px-3 py-1.5 text-sm';

  return (
    <button
      onClick={startScan}
      disabled={scanning}
      className={`${sizeClass} bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-1.5`}
    >
      {scanning ? (
        <>
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Scanning...
        </>
      ) : (
        'Scan'
      )}
    </button>
  );
}
