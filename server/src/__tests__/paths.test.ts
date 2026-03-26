import { describe, it, expect } from 'vitest';
import path from 'path';
import { safePath, ensureWithin } from '../utils/paths.js';

describe('safePath', () => {
  it('resolves a normal absolute path', () => {
    const result = safePath('/tmp/photos');
    expect(path.isAbsolute(result)).toBe(true);
  });

  it('resolves a relative path to absolute', () => {
    const result = safePath('some/relative/path');
    expect(path.isAbsolute(result)).toBe(true);
  });

  it('throws on null bytes', () => {
    expect(() => safePath('/tmp/photos\0/evil')).toThrow('null bytes');
  });

  it('throws on empty string', () => {
    expect(() => safePath('')).toThrow('Invalid path');
  });

  it('throws on non-string input', () => {
    expect(() => safePath(undefined as any)).toThrow('Invalid path');
    expect(() => safePath(null as any)).toThrow('Invalid path');
    expect(() => safePath(123 as any)).toThrow('Invalid path');
  });

  it('normalizes .. sequences to an absolute path', () => {
    const result = safePath('/tmp/photos/../videos');
    expect(result).not.toContain('..');
    expect(path.isAbsolute(result)).toBe(true);
  });
});

describe('ensureWithin', () => {
  it('allows a file directly inside the root', () => {
    expect(() => ensureWithin('/media/photos/img.jpg', '/media/photos')).not.toThrow();
  });

  it('allows a file in a subdirectory', () => {
    expect(() => ensureWithin('/media/photos/2024/img.jpg', '/media/photos')).not.toThrow();
  });

  it('allows the root path itself', () => {
    expect(() => ensureWithin('/media/photos', '/media/photos')).not.toThrow();
  });

  it('rejects path traversal via ..', () => {
    expect(() => ensureWithin('/media/photos/../secrets/passwd', '/media/photos')).toThrow('Path traversal');
  });

  it('rejects a completely different path', () => {
    expect(() => ensureWithin('/etc/passwd', '/media/photos')).toThrow('Path traversal');
  });

  it('rejects a sibling directory with overlapping prefix', () => {
    // /media/photos-backup should NOT pass for root /media/photos
    expect(() => ensureWithin('/media/photos-backup/img.jpg', '/media/photos')).toThrow('Path traversal');
  });
});
