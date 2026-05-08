import { describe, it, expect } from 'vitest';
import { rowToMedia, getErrorMessage } from '../src/utils/db.js';

describe('rowToMedia', () => {
  it('maps a row array to a MediaFile object', () => {
    const row = [
      1,
      2,
      '/path/to/photo.jpg',
      'photo.jpg',
      'photo.jpg',
      'image',
      2048,
      'image/jpeg',
      '2024-01-01T00:00:00Z',
      '2024-01-02T00:00:00Z',
      '2024-01-03T00:00:00Z',
      null,
      0,
      0,
    ];
    const media = rowToMedia(row);
    expect(media.id).toBe(1);
    expect(media.album_id).toBe(2);
    expect(media.file_path).toBe('/path/to/photo.jpg');
    expect(media.filename).toBe('photo.jpg');
    expect(media.file_type).toBe('image');
    expect(media.file_size).toBe(2048);
    expect(media.mime_type).toBe('image/jpeg');
    expect(media.thumbnail_path).toBeNull();
    expect(media.thumbnail_generated).toBe(0);
    expect(media.is_favorite).toBe(0);
  });

  it('handles video type and non-null thumbnail path', () => {
    const row = [10, 3, '/p/v.mp4', 'v.mp4', 'v.mp4', 'video', 5000, 'video/mp4',
      null, '2024-06-01', '2024-06-01', '/cache/thumb.jpg', 1, 1];
    const media = rowToMedia(row);
    expect(media.file_type).toBe('video');
    expect(media.thumbnail_path).toBe('/cache/thumb.jpg');
    expect(media.thumbnail_generated).toBe(1);
    expect(media.is_favorite).toBe(1);
  });
});

describe('getErrorMessage', () => {
  it('returns message from an Error instance', () => {
    expect(getErrorMessage(new Error('something failed'))).toBe('something failed');
  });

  it('returns string errors directly', () => {
    expect(getErrorMessage('raw error')).toBe('raw error');
  });

  it('returns default fallback for unknown types', () => {
    expect(getErrorMessage(42)).toBe('An unexpected error occurred');
    expect(getErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getErrorMessage({ code: 404 })).toBe('An unexpected error occurred');
  });

  it('returns a custom fallback when provided', () => {
    expect(getErrorMessage({}, 'Custom message')).toBe('Custom message');
  });
});
