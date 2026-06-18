import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { useAlbums } from '@/hooks/useAlbums';
import ThemePicker from '@/components/ThemePicker';
import * as api from '@/api';
import type { AppSettings } from '@/api';
import { getErrorMessage } from '@/utils/errors';
import { SCAN_POLL_INTERVAL_MS } from '@/constants';
import { queryKeys } from '@/queryKeys';
import AlbumForm from '@/components/AlbumForm';
import ScanButton from '@/components/ScanButton';
import ThumbnailButton from '@/components/ThumbnailButton';
import PasswordSettings from '@/components/PasswordSettings';
import type { Album } from '@/types';
import { Button, Surface } from '@/components/ui';

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

const statusStyles: Record<string, { label: string; background: string; color: string }> = {
  completed: { label: 'completed', background: '#dcfce7', color: '#16a34a' },
  scanning: { label: 'scanning', background: '#fef3c7', color: '#a16207' },
  error: { label: 'error', background: '#fee2e2', color: '#dc2626' },
  idle: { label: 'idle', background: '#f3f4f6', color: '#6b7280' },
  virtual: { label: 'virtual', background: '#f3f4f6', color: '#6b7280' },
};

function StatusBadge({ status }: { status?: string }) {
  const meta = statusStyles[status || 'idle'] || statusStyles.idle;
  return (
    <span
      className="inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium"
      style={{ background: meta.background, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

export default function SettingsPage() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { albums, loading, refresh } = useAlbums();
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

  const { data: settings = null } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: api.getSettings,
  });

  const createAlbumMutation = useMutation({
    mutationFn: ({ name, path }: { name: string; path: string }) => api.createAlbum(name, path),
    onSuccess: () => {
      void refresh();
    },
  });
  const updateAlbumMutation = useMutation({
    mutationFn: ({ id, name, path }: { id: number; name: string; path: string }) =>
      api.updateAlbum(id, { name, path }),
    onSuccess: () => {
      void refresh();
    },
  });
  const deleteAlbumMutation = useMutation({
    mutationFn: api.deleteAlbum,
    onSuccess: () => {
      void refresh();
    },
  });
  const reorderAlbumsMutation = useMutation({
    mutationFn: api.reorderAlbums,
    onSuccess: () => {
      void refresh();
    },
  });
  const updateSettingsMutation = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: (_, data) => {
      queryClient.setQueryData<AppSettings>(queryKeys.settings, (current) => {
        if (!current) return current;
        return { ...current, ...data };
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });

  useEffect(() => {
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
    a.download = `stashr-backup-${new Date().toISOString().split('T')[0]}.json`;
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
              await createAlbumMutation.mutateAsync({ name: album.name, path: album.path });
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
      await createAlbumMutation.mutateAsync({ name, path });
      setShowCreate(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create album'));
    }
  };

  const handleUpdate = async (name: string, path: string) => {
    if (!editingAlbum) return;
    try {
      setError(null);
      await updateAlbumMutation.mutateAsync({ id: editingAlbum.id, name, path });
      setEditingAlbum(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update album'));
    }
  };

  const handleDelete = async (album: Album) => {
    if (!confirm(`Delete album "${album.name}"? This won't delete any media files.`)) return;
    try {
      setError(null);
      await deleteAlbumMutation.mutateAsync(album.id);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete album'));
    }
  };

  const handleToggleFavoritesOnHome = async (enabled: boolean) => {
    try {
      setError(null);
      await updateSettingsMutation.mutateAsync({ favorites_on_home: enabled });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update settings'));
    }
  };

  const handleToggleUseOriginals = async (enabled: boolean) => {
    localStorage.setItem('gallery-originals', enabled ? 'true' : 'false');
    try {
      setError(null);
      await updateSettingsMutation.mutateAsync({ gallery_use_originals: enabled });
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

      await reorderAlbumsMutation.mutateAsync(albumsInOrder.map(a => a.id));
      if (favIdx !== -1) {
        await updateSettingsMutation.mutateAsync({ favorites_sort_order: favIdx });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reorder'));
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const combinedList = buildCombinedList();

  return (
    <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-text">
            Settings
          </h1>
          <p className="text-sm mt-0.5 text-text2">
            Manage albums, themes, and preferences.
          </p>
        </div>

        {error && (
          <Surface className="mb-4 px-4 py-3 text-sm" style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#dc2626' }}>
            {error}
          </Surface>
        )}

        {/* Theme Section */}
        <Surface className="p-6 mb-5">
          <h2 className="text-base font-bold mb-1 text-text">Themes</h2>
          <p className="text-xs text-text2 mb-5">
            Choose how Stashr looks to you.
          </p>
          <ThemePicker />
        </Surface>

        {/* Display Section */}
        <Surface className="p-6 mb-5">
          <h2 className="text-base font-bold mb-1 text-text">Display</h2>
          <p className="text-xs text-text2 mb-5">
            Control how media is shown in the gallery.
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">Show originals in gallery</p>
              <p className="text-xs text-text2 mt-0.5">Serve original files instead of thumbnails. Animated GIFs and WebP play in the grid, but loading may be slower.</p>
            </div>
            <label className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border transition-colors ml-6 flex-shrink-0"
              style={{
                background: settings?.gallery_use_originals ? theme.accent : theme.surface2,
                borderColor: settings?.gallery_use_originals ? theme.accent : theme.border,
              }}
            >
              <input
                className="sr-only"
                type="checkbox"
                checked={settings?.gallery_use_originals ?? false}
                onChange={e => handleToggleUseOriginals(e.target.checked)}
              />
              <span
                className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-[left]"
                style={{ left: settings?.gallery_use_originals ? 20 : 2 }}
              />
            </label>
          </div>
        </Surface>

        {/* Albums Section */}
        <Surface className="p-6 mb-5">
          <h2 className="text-base font-bold mb-1 text-text">Albums</h2>
          <p className="text-xs text-text2 mb-5">
            Add folders, scan for media, and reorder how albums appear.
          </p>

          <div className="mb-4 flex flex-wrap gap-2.5">
            <Button variant="primary" onClick={() => { setShowCreate(true); setEditingAlbum(null); }}>
              Add album
            </Button>
            <Button variant="secondary" onClick={handleScanAll} disabled={scanningAll || albums.length === 0}>
              {scanningAll ? 'Scanning...' : 'Scan all'}
            </Button>
            <Button variant="secondary" onClick={handleGenerateAllThumbnails} disabled={generatingAll || albums.length === 0}>
              {generatingAll ? 'Generating...' : 'All thumbnails'}
            </Button>
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
            <p className="text-sm text-text2">Loading...</p>
          ) : albums.length === 0 ? (
            <p className="text-sm text-text2">No albums yet. Add your first album to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr>
                    <th className="w-8 border-b px-3 py-2 text-xs font-medium text-text2" style={{ borderColor: theme.border }}></th>
                    <th className="border-b px-3 py-2 text-xs font-medium text-text2" style={{ borderColor: theme.border }}>Name</th>
                    <th className="border-b px-3 py-2 text-xs font-medium text-text2" style={{ borderColor: theme.border }}>Status</th>
                    <th className="border-b px-3 py-2 text-right text-xs font-medium text-text2" style={{ borderColor: theme.border }}>Actions</th>
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
                      style={{
                        opacity: dragIndex === index ? 0.4 : 1,
                        background: row.isFavorites ? theme.surface2 : 'transparent',
                      }}
                    >
                      <td className="border-b px-3 py-2 text-text" style={{ borderColor: theme.border }}>
                        <span className="inline-flex cursor-grab px-1 text-text2 active:cursor-grabbing">
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
                      <td className="border-b px-3 py-2 font-medium text-text" style={{ borderColor: theme.border }}>
                        {row.isFavorites ? (
                          <span className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-warning">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            {row.name}
                          </span>
                        ) : row.name}
                      </td>
                      <td className="border-b px-3 py-2" style={{ borderColor: theme.border }}>
                        {row.isFavorites ? (
                          <StatusBadge status="virtual" />
                        ) : (
                          <StatusBadge status={row.scan_status} />
                        )}
                      </td>
                      <td className="border-b px-3 py-2 text-right" style={{ borderColor: theme.border }}>
                        {row.isFavorites ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-text2">Show on home</span>
                            <label className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border transition-colors"
                              style={{
                                background: settings?.favorites_on_home ? theme.accent : theme.surface2,
                                borderColor: settings?.favorites_on_home ? theme.accent : theme.border,
                              }}
                            >
                              <input
                                className="sr-only"
                                type="checkbox"
                                checked={settings?.favorites_on_home ?? false}
                                onChange={e => handleToggleFavoritesOnHome(e.target.checked)}
                              />
                              <span
                                className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-[left]"
                                style={{ left: settings?.favorites_on_home ? 20 : 2 }}
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <ThumbnailButton albumId={row.id} size="sm" />
                            <ScanButton albumId={row.id} onComplete={refresh} size="sm" />
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => { setEditingAlbum(row.albumData!); setShowCreate(false); }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDelete(row.albumData!)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Surface>

        {/* Data Section */}
        <Surface className="p-6 mb-5">
          <h2 className="text-base font-bold mb-1 text-text">Data</h2>
          <p className="text-xs text-text2 mb-5">
            Export or import your album configuration as JSON. This saves album names, paths, and order — not media files.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExport}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export Settings
            </Button>
            <Button variant="secondary" onClick={() => document.getElementById('import-input')?.click()}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Import Settings
            </Button>
            <input
              id="import-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </Surface>

        {/* Password Protection Section */}
        <Surface className="p-6">
          <h2 className="text-base font-bold mb-1 text-text">Password protection</h2>
          <p className="text-xs text-text2 mb-5">
            Optionally lock Stashr with a password.
          </p>
          <PasswordSettings />
        </Surface>
    </div>
  );
}
