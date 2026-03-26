import path from 'path';

export function safePath(userInput: string): string {
  if (!userInput || typeof userInput !== 'string') {
    throw new Error('Invalid path');
  }
  if (userInput.includes('\0')) {
    throw new Error('Invalid path: contains null bytes');
  }
  return path.resolve(userInput);
}

export function ensureWithin(filePath: string, allowedRoot: string): void {
  const resolvedFile = path.resolve(filePath);
  const resolvedRoot = path.resolve(allowedRoot);
  if (
    resolvedFile !== resolvedRoot &&
    !resolvedFile.startsWith(resolvedRoot + path.sep)
  ) {
    throw new Error('Path traversal detected');
  }
}

export function isAbsolutePath(p: string): boolean {
  return path.isAbsolute(p);
}
