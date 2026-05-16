import { useEffect, useState } from 'react';
import { getMediaMetadata, type MediaMetadata } from '@/api/client';
import type { MediaFile } from '@/types';

function fmt(n: number | null | undefined, digits = 1): string {
  if (n == null) return '—';
  return Number(n).toFixed(digits);
}

function fmtExposure(s: number | null): string {
  if (s == null) return '—';
  if (s >= 1) return `${s.toFixed(1)}s`;
  return `1/${Math.round(1 / s)}s`;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

interface Props {
  media: MediaFile;
  onClose: () => void;
}

export default function MediaInfoPanel({ media, onClose }: Props) {
  const [meta, setMeta] = useState<MediaMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setMeta(null);
    getMediaMetadata(media.id)
      .then(setMeta)
      .catch(() => setMeta(null))
      .finally(() => setLoading(false));
  }, [media.id]);

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-white/50">{label}</span>
      <span className="text-white/90 text-right truncate">{value}</span>
    </div>
  );

  return (
    <div
      className="absolute top-0 right-0 h-full w-80 max-w-[85vw] z-20 bg-black/80 backdrop-blur-md text-white overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-white/70">Info</h2>
        <button
          onClick={onClose}
          aria-label="Close info"
          className="p-1 text-white/60 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-xs font-semibold uppercase text-white/40 mb-1">File</h3>
          {row('Name', <span title={media.filename}>{media.filename}</span>)}
          {row('Type', media.mime_type)}
          {row('Size', fmtSize(media.file_size))}
          {row('Modified', new Date(media.modified_at).toLocaleString())}
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase text-white/40 mb-1">EXIF</h3>
          {loading ? (
            <p className="text-sm text-white/50">Loading…</p>
          ) : !meta ? (
            <p className="text-sm text-white/50">No EXIF data.</p>
          ) : (
            <>
              {row('Taken', meta.date_taken ? new Date(meta.date_taken).toLocaleString() : '—')}
              {row('Dimensions', meta.width && meta.height ? `${meta.width} × ${meta.height}` : '—')}
              {row('Camera', [meta.camera_make, meta.camera_model].filter(Boolean).join(' ') || '—')}
              {row('Lens', meta.lens ?? '—')}
              {row('ISO', meta.iso ?? '—')}
              {row('Aperture', meta.f_number ? `f/${fmt(meta.f_number, 1)}` : '—')}
              {row('Shutter', fmtExposure(meta.exposure_time))}
              {row('Focal length', meta.focal_length ? `${fmt(meta.focal_length, 0)}mm` : '—')}
              {meta.gps_lat != null && meta.gps_lon != null
                && row('GPS', `${fmt(meta.gps_lat, 4)}, ${fmt(meta.gps_lon, 4)}`)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
