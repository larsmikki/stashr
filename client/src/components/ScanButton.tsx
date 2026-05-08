import { useState, useEffect, useRef } from 'react';
import { scanAlbum, getScanStatus } from '@/api/client';
import { SCAN_POLL_INTERVAL_MS } from '@/constants';

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

  const sizeClass = size === 'sm' ? 'settings-action-btn settings-action-btn-green' : '';
  const mdStyle = size === 'md' ? {
    padding: '6px 12px',
    fontSize: '13px',
    borderRadius: '8px',
    background: '#dcfce7',
    color: '#16a34a',
    border: 'none',
    cursor: scanning ? 'not-allowed' : 'pointer',
    opacity: scanning ? 0.6 : 1,
    display: 'inline-flex' as const,
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'inherit',
    fontWeight: 500,
  } : undefined;

  return (
    <button
      onClick={startScan}
      disabled={scanning}
      className={`${sizeClass} inline-flex items-center gap-1.5`}
      style={mdStyle}
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
