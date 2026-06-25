const BASE = '';
const TOKEN_KEY = 'auth-token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Callback set by AuthContext to handle 401s
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null): void {
  onUnauthorized = cb;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    setToken(null);
    if (onUnauthorized) onUnauthorized();
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

import type { Album, HomeAlbum, MediaFile, PaginatedResponse, BrowseResult, ScanStatus, ThumbnailStatus } from '@/types';

// Auth
export interface AuthStatus {
  passwordSet: boolean;
  authenticated: boolean;
}

export const getAuthStatus = () => request<AuthStatus>('/api/auth/status');

export const login = async (password: string): Promise<string> => {
  const result = await request<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  setToken(result.token);
  return result.token;
};

export const setPasswordApi = async (newPassword: string, currentPassword?: string): Promise<string> => {
  const result = await request<{ status: string; token: string }>('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ newPassword, currentPassword }),
  });
  setToken(result.token);
  return result.token;
};

export const removePasswordApi = (currentPassword: string) =>
  request<{ status: string }>('/api/auth/password', {
    method: 'DELETE',
    body: JSON.stringify({ currentPassword }),
  });

// Albums
export const getAlbums = () => request<Album[]>('/api/albums');
export const getAlbum = (id: number) => request<Album>(`/api/albums/${id}`);
export const createAlbum = (name: string, path: string) =>
  request<Album>('/api/albums', { method: 'POST', body: JSON.stringify({ name, path }) });
export const updateAlbum = (id: number, data: { name?: string; path?: string }) =>
  request<Album>(`/api/albums/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAlbum = (id: number) =>
  request<void>(`/api/albums/${id}`, { method: 'DELETE' });
export const reorderAlbums = (albumIds: number[]) =>
  request<{ status: string }>('/api/albums/reorder', { method: 'PUT', body: JSON.stringify({ albumIds }) });

// Scanning
export const scanAlbum = (id: number) =>
  request<{ status: string }>(`/api/albums/${id}/scan`, { method: 'POST' });
export const scanAll = () =>
  request<{ status: string; albumCount: number }>('/api/albums/scan-all', { method: 'POST' });
export const getScanStatus = (id: number) =>
  request<ScanStatus>(`/api/albums/${id}/scan-status`);

// Thumbnails
export const getThumbnailStatus = (id: number) =>
  request<ThumbnailStatus>(`/api/albums/${id}/thumbnail-status`);
export const generateThumbnails = (id: number) =>
  request<{ status: string }>(`/api/albums/${id}/generate-thumbnails`, { method: 'POST' });
export const generateAllThumbnails = () =>
  request<{ status: string; albumCount: number }>('/api/albums/generate-all-thumbnails', { method: 'POST' });

// Media
export const getMedia = (albumId: number, params: { sort?: string; order?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params.sort) qs.set('sort', params.sort);
  if (params.order) qs.set('order', params.order);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  return request<PaginatedResponse<MediaFile>>(`/api/albums/${albumId}/media?${qs}`);
};

// Metadata
export interface MediaMetadata {
  camera_make: string | null;
  camera_model: string | null;
  lens: string | null;
  width: number | null;
  height: number | null;
  orientation: number | null;
  iso: number | null;
  focal_length: number | null;
  f_number: number | null;
  exposure_time: number | null;
  gps_lat: number | null;
  gps_lon: number | null;
}

export const getMediaMetadata = (mediaId: number) =>
  request<MediaMetadata | null>(`/api/media/${mediaId}/metadata`);

// Favorites
export const toggleFavorite = (mediaId: number) =>
  request<MediaFile>(`/api/media/${mediaId}/favorite`, { method: 'PUT' });

export const bulkFavorite = (ids: number[], favorite: boolean) =>
  request<{ status: string; updated: number; favorite: boolean }>(
    '/api/media/bulk-favorite',
    { method: 'PUT', body: JSON.stringify({ ids, favorite }) },
  );

export const bulkDownloadUrl = (ids: number[]) =>
  `/api/media/bulk-download?ids=${ids.join(',')}${authQuery().replace(/^\?/, '&')}`;

export const getFavorites = (params: { sort?: string; order?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params.sort) qs.set('sort', params.sort);
  if (params.order) qs.set('order', params.order);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  return request<PaginatedResponse<MediaFile>>(`/api/favorites?${qs}`);
};

// Settings
export interface AppSettings {
  favorites_on_home: boolean;
  favorites_sort_order: number;
  favorites_count: number;
  gallery_use_originals: boolean;
}
export const getSettings = () => request<AppSettings>('/api/settings');
export const updateSettings = (data: Partial<Pick<AppSettings, 'favorites_on_home' | 'favorites_sort_order' | 'gallery_use_originals'>>) =>
  request<{ status: string }>('/api/settings', { method: 'PUT', body: JSON.stringify(data) });

// Home
export const getHome = () => request<{ albums: HomeAlbum[] }>('/api/home');

// Wall
export const getWall = () => request<{ items: MediaFile[] }>('/api/wall');

// Filesystem
export const browsePath = (path?: string) => {
  const qs = path ? `?path=${encodeURIComponent(path)}` : '';
  return request<BrowseResult>(`/api/filesystem/browse${qs}`);
};

// URL helpers (these need auth token as query param for non-fetch requests)
function authQuery(): string {
  const token = getToken();
  return token ? `?token=${encodeURIComponent(token)}` : '';
}

export const thumbnailUrl = (mediaId: number) => `/api/thumbnails/${mediaId}${authQuery()}`;
export const streamUrl = (mediaId: number) => `/api/media/${mediaId}/stream${authQuery()}`;
export const fullUrl = (mediaId: number) => `/api/media/${mediaId}/full${authQuery()}`;
export const transcodeUrl = (mediaId: number) => `/api/media/${mediaId}/transcode/playlist.m3u8${authQuery()}`;
