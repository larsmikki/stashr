import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAlbums } from '../hooks/useAlbums';
import { useTheme, THEMES } from '../contexts/ThemeContext';
import * as api from '../api/client';
import { getErrorMessage } from '../utils/errors';
import { SCAN_POLL_INTERVAL_MS } from '../constants';
import AlbumForm from '../components/AlbumForm';
import ScanButton from '../components/ScanButton';
import ThumbnailButton from '../components/ThumbnailButton';
import PasswordSettings from '../components/PasswordSettings';
import type { Album } from '../types';
import './settings.css';

export default function SettingsPage() {
  const { albums, loading, refresh } = useAlbums();
  const { theme, setThemeByName } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanningAll, setScanningAll] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const scanAllIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thumbAllIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (scanAllIntervalRef.current) clearInterval(scanAllIntervalRef.current);
      if (thumbAllIntervalRef.current) clearInterval(thumbAllIntervalRef.current);
    };
  }, []);

  const handleCreate = async (name: string, path: string) => {
    try {
      setError(null);
      await api.createAlbum(name, path);
      setShowCreate(false);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create album'));
    }
  };

  const handleUpdate = async (name: string, path: string) => {
    if (!editingAlbum) return;
    try {
      setError(null);
      await api.updateAlbum(editingAlbum.id, { name, path });
      setEditingAlbum(null);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update album'));
    }
  };

  const handleDelete = async (album: Album) => {
    if (!confirm(`Delete album "${album.name}"? This won't delete any media files.`)) return;
    try {
      setError(null);
      await api.deleteAlbum(album.id);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete album'));
    }
  };

  const handleGenerateAllThumbnails = async () => {
    try {
      setGeneratingAll(true);
      await api.generateAllThumbnails();
      thumbAllIntervalRef.current = setInterval(async () => {
        const updated = await api.getAlbums();
        const statuses = await Promise.all(updated.map(a => api.getThumbnailStatus(a.id)));
        const anyGenerating = statuses.some(s => s.generating);
        if (!anyGenerating) {
          if (thumbAllIntervalRef.current) clearInterval(thumbAllIntervalRef.current);
          setGeneratingAll(false);
        }
      }, SCAN_POLL_INTERVAL_MS);
    } catch {
      setGeneratingAll(false);
    }
  };

  const handleScanAll = async () => {
    try {
      setScanningAll(true);
      await api.scanAll();
      scanAllIntervalRef.current = setInterval(async () => {
        const updated = await api.getAlbums();
        const anyScanning = updated.some(a => a.scan_status === 'scanning');
        if (!anyScanning) {
          if (scanAllIntervalRef.current) clearInterval(scanAllIntervalRef.current);
          setScanningAll(false);
          refresh();
        }
      }, SCAN_POLL_INTERVAL_MS);
    } catch {
      setScanningAll(false);
    }
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  const handleDrop = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) {
      setDragIndex(null);
      return;
    }

    const reordered = [...albums];
    const [moved] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, moved);

    dragItem.current = null;
    dragOverItem.current = null;
    setDragIndex(null);

    try {
      setError(null);
      await api.reorderAlbums(reordered.map(a => a.id));
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reorder albums'));
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const getStatusClass = (status: string | undefined) => {
    switch (status) {
      case 'completed': return 'settings-status-completed';
      case 'scanning': return 'settings-status-scanning';
      case 'error': return 'settings-status-error';
      default: return 'settings-status-idle';
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        {/* Header */}
        <div className="settings-header">
          <Link to="/" className="settings-back-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>
          <h1>Settings</h1>
        </div>

        {error && (
          <div className="settings-error">{error}</div>
        )}

        {/* Theme Section */}
        <section className="settings-section">
          <h2>Theme</h2>
          <div className="theme-grid">
            {THEMES.map(t => (
              <button
                key={t.name}
                className={`theme-card${theme.name === t.name ? ' active' : ''}`}
                onClick={() => setThemeByName(t.name)}
              >
                <div
                  className="theme-preview"
                  style={{ background: t.bg }}
                >
                  {t.previewColors.map((color, i) => (
                    <div
                      key={i}
                      className="theme-preview-bar"
                      style={{ background: color, width: `${90 - i * 15}%` }}
                    />
                  ))}
                </div>
                <span className="theme-name">{t.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Albums Section */}
        <section className="settings-section">
          <h2>Albums</h2>

          <div className="settings-buttons" style={{ marginBottom: 16 }}>
            <button
              onClick={() => { setShowCreate(true); setEditingAlbum(null); }}
              className="btn btn-primary"
            >
              Add Album
            </button>
            <button
              onClick={handleScanAll}
              disabled={scanningAll || albums.length === 0}
              className="btn btn-secondary"
            >
              {scanningAll ? 'Scanning All...' : 'Scan All'}
            </button>
            <button
              onClick={handleGenerateAllThumbnails}
              disabled={generatingAll || albums.length === 0}
              className="btn btn-secondary"
            >
              {generatingAll ? 'Generating...' : 'All Thumbnails'}
            </button>
          </div>

          {showCreate && (
            <div style={{ marginBottom: 16 }}>
              <AlbumForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
            </div>
          )}

          {editingAlbum && (
            <div style={{ marginBottom: 16 }}>
              <AlbumForm
                initialName={editingAlbum.name}
                initialPath={editingAlbum.path}
                onSubmit={handleUpdate}
                onCancel={() => setEditingAlbum(null)}
                submitLabel="Save"
              />
            </div>
          )}

          {loading ? (
            <p className="settings-info-text">Loading...</p>
          ) : albums.length === 0 ? (
            <p className="settings-info-text">No albums yet. Click "Add Album" to get started.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="settings-album-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Name</th>
                    <th>Path</th>
                    <th>Files</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {albums.map((album, index) => (
                    <tr
                      key={album.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      style={{ opacity: dragIndex === index ? 0.4 : 1 }}
                    >
                      <td>
                        <span className="settings-drag-handle">
                          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="9" cy="5" r="1.5" />
                            <circle cx="15" cy="5" r="1.5" />
                            <circle cx="9" cy="12" r="1.5" />
                            <circle cx="15" cy="12" r="1.5" />
                            <circle cx="9" cy="19" r="1.5" />
                            <circle cx="15" cy="19" r="1.5" />
                          </svg>
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{album.name}</td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={album.path}>
                        {album.path}
                      </td>
                      <td>{album.file_count || 0}</td>
                      <td>
                        <span className={`settings-status-badge ${getStatusClass(album.scan_status)}`}>
                          {album.scan_status || 'idle'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <ThumbnailButton albumId={album.id} size="sm" />
                          <ScanButton albumId={album.id} onComplete={refresh} size="sm" />
                          <button
                            onClick={() => { setEditingAlbum(album); setShowCreate(false); }}
                            className="settings-action-btn settings-action-btn-blue"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(album)}
                            className="settings-action-btn settings-action-btn-red"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Password Protection Section */}
        <section className="settings-section">
          <h2>Password Protection</h2>
          <PasswordSettings />
        </section>
      </div>
    </div>
  );
}
