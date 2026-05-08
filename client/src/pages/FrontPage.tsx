import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHome } from '@/api/client';
import { getErrorMessage } from '@/utils/errors';
import AlbumRow from '@/components/AlbumRow';
import MediaViewer from '@/components/MediaViewer';
import { useTheme } from '@/contexts/ThemeContext';
import type { HomeAlbum, MediaFile } from '@/types';

export default function FrontPage() {
  const { theme } = useTheme();
  const [albums, setAlbums] = useState<HomeAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerMedia, setViewerMedia] = useState<MediaFile | null>(null);
  const [viewerItems, setViewerItems] = useState<MediaFile[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    getHome()
      .then(data => setAlbums(data.albums))
      .catch(err => setError(getErrorMessage(err, 'Failed to load home')))
      .finally(() => setLoading(false));
  }, []);

  const handleMediaClick = (media: MediaFile, allMedia: MediaFile[]) => {
    const idx = allMedia.findIndex(m => m.id === media.id);
    setViewerMedia(media);
    setViewerItems(allMedia);
    setViewerIndex(idx >= 0 ? idx : 0);
  };

  const albumsWithMedia = albums.filter(a => a.media.length > 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626' }}>
          {error}
        </div>
      )}
      {loading ? (
        <div className="text-center py-16" style={{ color: theme.text2 }}>Loading...</div>
      ) : albumsWithMedia.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2" style={{ color: theme.text }}>Welcome to Stashy</h2>
          <p className="mb-4" style={{ color: theme.text2 }}>
            No albums configured yet, or albums haven't been scanned.
          </p>
          <Link
            to="/settings"
            className="inline-block px-4 py-2 rounded-lg text-white font-medium"
            style={{ background: theme.gradient }}
          >
            Add an Album
          </Link>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: theme.text }}>
              Your Collection
            </h1>
            <p className="text-sm mt-0.5" style={{ color: theme.text2 }}>
              {albumsWithMedia.length} {albumsWithMedia.length === 1 ? 'album' : 'albums'} added
            </p>
          </div>
          {albumsWithMedia.map(album => (
            <AlbumRow
              key={album.id}
              album={album}
              onMediaClick={handleMediaClick}
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
        />
      )}
    </div>
  );
}
