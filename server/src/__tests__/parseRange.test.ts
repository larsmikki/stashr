import { describe, it, expect } from 'vitest';
import { parseRange } from '../utils/stream.js';

describe('parseRange', () => {
  const fileSize = 10000;

  it('returns null when no header provided', () => {
    expect(parseRange(undefined, fileSize)).toBeNull();
  });

  it('returns null for malformed header', () => {
    expect(parseRange('invalid', fileSize)).toBeNull();
    expect(parseRange('bytes=-', fileSize)).toBeNull();
    expect(parseRange('bytes=abc-def', fileSize)).toBeNull();
  });

  it('parses a full range (start-end)', () => {
    const result = parseRange('bytes=0-499', fileSize);
    expect(result).toEqual({ start: 0, end: 499, total: fileSize });
  });

  it('parses an open-ended range (start-)', () => {
    const result = parseRange('bytes=500-', fileSize);
    expect(result).toEqual({ start: 500, end: 9999, total: fileSize });
  });

  it('returns null when start >= fileSize', () => {
    expect(parseRange('bytes=10000-', fileSize)).toBeNull();
    expect(parseRange('bytes=99999-', fileSize)).toBeNull();
  });

  it('returns null when end >= fileSize', () => {
    expect(parseRange('bytes=0-10000', fileSize)).toBeNull();
  });

  it('returns null when start > end', () => {
    expect(parseRange('bytes=500-100', fileSize)).toBeNull();
  });

  it('handles single byte range', () => {
    const result = parseRange('bytes=0-0', fileSize);
    expect(result).toEqual({ start: 0, end: 0, total: fileSize });
  });

  it('handles last byte', () => {
    const result = parseRange('bytes=9999-9999', fileSize);
    expect(result).toEqual({ start: 9999, end: 9999, total: fileSize });
  });
});
