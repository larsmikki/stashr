import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAlbums } from '@/hooks/useAlbums';
import ThemePicker from '@/components/ThemePicker';
import * as api from '@/api/client';
import type { AppSettings } from '@/api/client';
import { getErrorMessage } from '@/utils/errors';
import { SCAN_POLL_INTERVAL_MS } from '@/constants';
import AlbumForm from '@/components/AlbumForm';
import ScanButton from '@/components/ScanButton';
import ThumbnailButton from '@/components/ThumbnailButton';
import PasswordSettings from '@/components/PasswordSettings';
import type { Album } from '@/types';
import '@/pages/settings.css';

// A row in the combined album+favorites list
interface CombinedRow {
  id: number;
  name: string;
  path: string;
  sort_order: number;
  file_count?: number;
  scan_status?: string;
  isFavorites: boolean;
  albumData?: Album;
}

export default function SettingsPage() {
  const { theme } = useTheme();
  const { albums, loading, refresh } = useAlbums();
  const [showCreate, setShowCreate] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanningAll, setScanningAll] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const scanAllIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thumbAllIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
    return () => {
      if (scanAllIntervalRef.current) clearInterval(scanAllIntervalRef.current);
      if (thumbAllIntervalRef.current) clearInterval(thumbAllIntervalRef.current);
    };
  }, []);

  const handleExport = () => {
    const data = { albums: albums.map(a => ({ name: a.name, path: a.path, sort_order: a.sort_order, scan_status: a.scan_status, last_scan_at: a.last_scan_at })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stashy-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string);
        const imported = data.albums || [];
        let created = 0;
        for (const album of imported) {
          if (album.name && album.path) {
            const existing = albums.find(a => a.name === album.name || a.path === album.path);
            if (!existing) {
              await api.createAlbum(album.name, album.path);
              created++;
            }
          }
        }
        await refresh();
        alert(`Imported ${created} new album${created !== 1 ? 's' : ''} (${imported.length - created} skipped - already exist)`);
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Build the combined list: albums + favorites entry, in sorted order
  const buildCombinedList = (): CombinedRow[] => {
    const albumRows: CombinedRow[] = albums.map(a => ({
      id: a.id,
      name: a.name,
      path: a.path,
      sort_order: a.sort_order,
      file_count: a.file_count,
      scan_status: a.scan_status,
      isFavorites: false,
      albumData: a,
    }));

    const favSortOrder = settings?.favorites_sort_order ?? 9999;
    const favRow: CombinedRow = {
      id: -1,
      name: 'Favorites',
      path: '',
      sort_order: favSortOrder,
      file_count: settings?.favorites_count,
      isFavorites: true,
    };

    // Insert favorites at the correct position
    const pos = Math.min(favSortOrder, albumRows.length);
    const result = [...albumRows];
    result.splice(pos, 0, favRow);
    return result;
  };

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

  const handleToggleFavoritesOnHome = async (enabled: boolean) => {
    try {
      setError(null);
      await api.updateSettings({ favorites_on_home: enabled });
      setSettings(s => s ? { ...s, favorites_on_home: enabled } : s);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update settings'));
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

    const combined = buildCombinedList();
    const reordered = [...combined];
    const [moved] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, moved);

    dragItem.current = null;
    dragOverItem.current = null;
    setDragIndex(null);

    try {
      setError(null);
      const albumsInOrder = reordered.filter(item => !item.isFavorites);
      const favIdx = reordered.findIndex(item => item.isFavorites);

      await api.reorderAlbums(albumsInOrder.map(a => a.id));
      if (favIdx !== -1) {
        await api.updateSettings({ favorites_sort_order: favIdx });
        setSettings(s => s ? { ...s, favorites_sort_order: favIdx } : s);
      }

      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reorder'));
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

  const combinedList = buildCombinedList();

  const sectionStyle = {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: theme.text }}>
            Settings
          </h1>
          <p className="text-sm mt-0.5" style={{ color: theme.text2 }}>
            Manage albums, themes, and preferences.
          </p>
        </div>

        {error && (
          <div className="settings-error">{error}</div>
        )}

        {/* Theme Section */}
        <div style={sectionStyle}>
          <h2 className="text-base font-bold mb-1" style={{ color: theme.text }}>Themes</h2>
          <p style={{ fontSize: '12px', color: theme.text2, marginBottom: '20px' }}>
            Choose how Stashy looks to you.
          </p>
          <ThemePicker />
        </div>

        {/* Albums Section */}
        <div style={sectionStyle}>
          <h2 className="text-base font-bold mb-1" style={{ color: theme.text }}>Albums</h2>
          <p style={{ fontSize: '12px', color: theme.text2, marginBottom: '20px' }}>
            Add folders, scan for media, and reorder how albums appear.
          </p>

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
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedList.map((row, index) => (
                    <tr
                      key={row.isFavorites ? 'favorites' : row.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      style={{ opacity: dragIndex === index ? 0.4 : 1 }}
                      className={row.isFavorites ? 'settings-favorites-row' : ''}
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
                      <td style={{ fontWeight: 500 }}>
                        {row.isFavorites ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            {row.name}
                          </span>
                        ) : row.name}
                      </td>
                      <td>
                        {row.isFavorites ? (
                          <span className="settings-status-badge settings-status-idle">virtual</span>
                        ) : (
                          <span className={`settings-status-badge ${getStatusClass(row.scan_status)}`}>
                            {row.scan_status || 'idle'}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {row.isFavorites ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            <span style={{ fontSize: 12, color: theme.text2 }}>Show on home</span>
                            <label className="settings-toggle" style={{ width: 'auto' }}>
                              <input
                                type="checkbox"
                                checked={settings?.favorites_on_home ?? false}
                                onChange={e => handleToggleFavoritesOnHome(e.target.checked)}
                              />
                              <span className="toggle-slider" />
                            </label>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <ThumbnailButton albumId={row.id} size="sm" />
                            <ScanButton albumId={row.id} onComplete={refresh} size="sm" />
                            <button
                              onClick={() => { setEditingAlbum(row.albumData!); setShowCreate(false); }}
                              className="settings-action-btn settings-action-btn-blue"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(row.albumData!)}
                              className="settings-action-btn settings-action-btn-red"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Data Section */}
        <div style={sectionStyle}>
          <h2 className="text-base font-bold mb-1" style={{ color: theme.text }}>Data</h2>
          <p style={{ fontSize: '12px', color: theme.text2, marginBottom: '20px' }}>
            Export or import your album configuration as JSON. This saves album names, paths, and order — not media files.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all hover:opacity-80"
              style={{ background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}` }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export Settings
            </button>
            <button
              onClick={() => document.getElementById('stashy-import-input')?.click()}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all hover:opacity-80"
              style={{ background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}` }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Import Settings
            </button>
            <input
              id="stashy-import-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>

        {/* Password Protection Section */}
        <div className="settings-section" style={sectionStyle}>
          <h2 className="text-base font-bold mb-1" style={{ color: theme.text }}>Password protection</h2>
          <p style={{ fontSize: '12px', color: theme.text2, marginBottom: '20px' }}>
            Optionally lock Stashy with a password.
          </p>
          <PasswordSettings />
        </div>
      </div>
    </div>
  );
}
