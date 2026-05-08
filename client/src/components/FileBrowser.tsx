import { useState, useEffect } from 'react';
import { browsePath } from '@/api/client';
import { getErrorMessage } from '@/utils/errors';
import type { BrowseResult } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

export default function FileBrowser({ isOpen, onClose, onSelect, initialPath }: Props) {
  const [result, setResult] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPath = async (path?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await browsePath(path);
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to browse'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPath(initialPath);
    }
  }, [isOpen, initialPath]);

  if (!isOpen) return null;

  const currentPath = result?.currentPath || '';
  const isWindows = /^[A-Z]:\\/i.test(currentPath);
  const pathSegments = currentPath
    ? currentPath.split(/[\\/]/).filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Select Folder</h3>
          <button onClick={onClose} aria-label="Close file browser" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 text-sm flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => loadPath()}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex-shrink-0"
          >
            Root
          </button>
          {pathSegments.map((segment, idx) => {
            const parts = pathSegments.slice(0, idx + 1);
            const fullPath = isWindows
              ? parts.join('\\') + '\\'
              : '/' + parts.join('/');
            return (
              <span key={idx} className="flex items-center gap-1 flex-shrink-0">
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => loadPath(fullPath)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {segment}
                </button>
              </span>
            );
          })}
        </div>

        {/* Directory list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : error ? (
            <div className="p-4 text-red-600 dark:text-red-400 text-sm">{error}</div>
          ) : result ? (
            <>
              {result.parent !== null && (
                <button
                  onClick={() => loadPath(result.parent!)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  ..
                </button>
              )}
              {result.directories.length === 0 && (
                <div className="p-4 text-gray-500 dark:text-gray-400 text-sm text-center">No subdirectories</div>
              )}
              {result.directories.map(dir => (
                <button
                  key={dir.path}
                  onClick={() => loadPath(dir.path)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700"
                >
                  <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{dir.name}</span>
                  {dir.hasChildren && (
                    <svg className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[60%]">
            {result?.currentPath || 'Select a folder'}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Cancel
            </button>
            <button
              onClick={() => result?.currentPath && onSelect(result.currentPath)}
              disabled={!result?.currentPath}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
