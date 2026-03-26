import fs from 'fs';
import path from 'path';
import { safePath } from '../utils/paths.js';
import type { BrowseResult, DirectoryEntry } from '../types/index.js';

function getDriveLetters(): DirectoryEntry[] {
  // On Windows, list common drive letters
  if (process.platform === 'win32') {
    const drives: DirectoryEntry[] = [];
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i);
      const drivePath = `${letter}:\\`;
      try {
        fs.accessSync(drivePath, fs.constants.R_OK);
        drives.push({ name: drivePath, path: drivePath, hasChildren: true });
      } catch {
        // Drive doesn't exist or not accessible
      }
    }
    return drives;
  }
  // On Linux/Mac, root is /
  return [{ name: '/', path: '/', hasChildren: true }];
}

function isRoot(p: string): boolean {
  if (process.platform === 'win32') {
    return /^[A-Z]:\\?$/i.test(p);
  }
  return p === '/';
}

export function browsePath(requestedPath?: string): BrowseResult {
  // No path given: return filesystem roots
  if (!requestedPath) {
    return {
      currentPath: '',
      parent: null,
      directories: getDriveLetters(),
    };
  }

  const resolved = safePath(requestedPath);

  // Verify it exists and is a directory
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    throw new Error('Path is not a directory');
  }

  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  const directories: DirectoryEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // Skip hidden directories
    if (entry.name.startsWith('.')) continue;

    const childPath = path.join(resolved, entry.name);
    let hasChildren = false;
    try {
      const children = fs.readdirSync(childPath, { withFileTypes: true });
      hasChildren = children.some(c => c.isDirectory());
    } catch {
      // Permission denied or other error
    }

    directories.push({
      name: entry.name,
      path: childPath,
      hasChildren,
    });
  }

  directories.sort((a, b) => a.name.localeCompare(b.name));

  const parent = isRoot(resolved) ? null : path.dirname(resolved);

  return {
    currentPath: resolved,
    parent,
    directories,
  };
}
