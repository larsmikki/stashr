import { useState } from 'react';
import FileBrowser from './FileBrowser';

interface Props {
  initialName?: string;
  initialPath?: string;
  onSubmit: (name: string, path: string) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export default function AlbumForm({ initialName = '', initialPath = '', onSubmit, onCancel, submitLabel = 'Create' }: Props) {
  const [name, setName] = useState(initialName);
  const [path, setPath] = useState(initialPath);
  const [showBrowser, setShowBrowser] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && path.trim()) {
      onSubmit(name.trim(), path.trim());
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Album Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My Photos"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Folder Path</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={path}
              onChange={e => setPath(e.target.value)}
              placeholder="/path/to/media"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowBrowser(true)}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 text-sm border border-gray-300 dark:border-gray-600"
            >
              Browse
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || !path.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </form>

      <FileBrowser
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
        onSelect={(selectedPath) => {
          setPath(selectedPath);
          setShowBrowser(false);
        }}
        initialPath={path || undefined}
      />
    </>
  );
}
