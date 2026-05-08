import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { streamUrl, transcodeUrl } from '@/api/client';
import type { MediaFile } from '@/types';

interface Props {
  media: MediaFile;
}

const NATIVE_TYPES = new Set(['video/mp4', 'video/webm']);

export default function VideoPlayer({ media }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (NATIVE_TYPES.has(media.mime_type)) {
      video.src = streamUrl(media.id);
    } else if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(transcodeUrl(media.id));
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = transcodeUrl(media.id);
    } else {
      // Fallback: try direct stream anyway
      video.src = streamUrl(media.id);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [media]);

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      className="max-h-full max-w-full w-full"
      playsInline
    />
  );
}
