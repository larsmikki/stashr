import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getHome } from '@/api';
import { getErrorMessage } from '@/utils/errors';
import { queryKeys } from '@/queryKeys';
import AlbumRow from '@/components/AlbumRow';
import MediaViewer from '@/components/MediaViewer';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui';
import type { HomeAlbum, MediaFile } from '@/types';

export default function FrontPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.home,
    queryFn: getHome,
  });
  const [viewerMedia, setViewerMedia] = useState<MediaFile | null>(null);
  const [viewerItems, setViewerItems] = useState<MediaFile[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const errorMessage = error ? getErrorMessage(error, 'Failed to load home') : null;

  const handleMediaClick = (media: MediaFile, allMedia: MediaFile[]) => {
    const idx = allMedia.findIndex(m => m.id === media.id);
    setViewerMedia(media);
    setViewerItems(allMedia);
    setViewerIndex(idx >= 0 ? idx : 0);
  };

  const handleFavoriteToggle = (updated: MediaFile) => {
    queryClient.setQueryData<{ albums: HomeAlbum[] }>(queryKeys.home, (current) => {
      if (!current) return current;
      return {
        albums: current.albums.map(album => ({
          ...album,
          media: album.media.map(m => m.id === updated.id ? updated : m),
        })),
      };
    });
    if (viewerMedia?.id === updated.id) setViewerMedia(updated);
  };

  const albumsWithMedia = useMemo(
    () => (data?.albums ?? []).filter(a => a.media.length > 0),
    [data?.albums],
  );

  return (
    <>
      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626' }}>
          {errorMessage}
        </div>
      )}
      {isLoading ? (
        <div className="text-center py-16" style={{ color: theme.text2 }}>Loading...</div>
      ) : albumsWithMedia.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2" style={{ color: theme.text }}>Welcome to Stashr</h2>
          <p className="mb-4" style={{ color: theme.text2 }}>
            No albums configured yet, or albums haven't been scanned.
          </p>
          <Button variant="primary" onClick={() => navigate('/settings')}>
            Add album
          </Button>
        </div>
      ) : (
        <div>
          {albumsWithMedia.map(album => (
            <AlbumRow
              key={album.id}
              album={album}
              onMediaClick={handleMediaClick}
              onFavoriteToggle={handleFavoriteToggle}
            />
          ))}
        </div>
      )}

      {viewerMedia && (
        <MediaViewer
          media={viewerMedia}
          items={viewerItems}
          currentIndex={viewerIndex}
          onClose={() => setViewerMedia(null)}
          onNavigate={(idx) => {
            setViewerIndex(idx);
            setViewerMedia(viewerItems[idx]);
          }}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}
    </>
  );
}
