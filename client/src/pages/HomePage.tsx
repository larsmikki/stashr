import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHome } from '../api/client';
import { getErrorMessage } from '../utils/errors';
import AlbumRow from '../components/AlbumRow';
import MediaViewer from '../components/MediaViewer';
import type { HomeAlbum, MediaFile } from '../types';

export default function HomePage() {
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
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {loading ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : albumsWithMedia.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Welcome to Stashy</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No albums configured yet, or albums haven't been scanned.
          </p>
          <Link
            to="/settings"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add an Album
          </Link>
        </div>
      ) : (
        albumsWithMedia.map(album => (
          <AlbumRow
            key={album.id}
            album={album}
            onMediaClick={handleMediaClick}
          />
        ))
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
