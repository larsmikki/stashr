export interface StreamRange {
  start: number;
  end: number;
  total: number;
}

export function parseRange(rangeHeader: string | undefined, fileSize: number): StreamRange | null {
  if (!rangeHeader) return null;

  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) return null;

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

  if (start >= fileSize || end >= fileSize || start > end) return null;

  return { start, end, total: fileSize };
}
