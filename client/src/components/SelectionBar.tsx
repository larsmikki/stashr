import { useState } from 'react';
import { toast } from 'sonner';
import { bulkFavorite, bulkDownloadUrl } from '@/api/client';
import { getErrorMessage } from '@/utils/errors';
import { useTheme } from '@/contexts/ThemeContext';
import type { MediaFile } from '@/types';

interface Props {
  ids: Set<number>;
  items: MediaFile[];
  onClear: () => void;
  onMutate?: (updated: MediaFile) => void;
}

export default function SelectionBar({ ids, items, onClear, onMutate }: Props) {
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);

  if (!ids.size) return null;

  const idArray = Array.from(ids);

  const setFavoriteAll = async (favorite: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      await bulkFavorite(idArray, favorite);
      if (onMutate) {
        for (const item of items) {
          if (ids.has(item.id)) onMutate({ ...item, is_favorite: favorite ? 1 : 0 });
        }
      }
      toast.success(`${favorite ? 'Favorited' : 'Unfavorited'} ${idArray.length} item${idArray.length === 1 ? '' : 's'}`);
      onClear();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Bulk update failed'));
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    window.location.href = bulkDownloadUrl(idArray);
  };

  const btnStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '13px',
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    background: theme.surface2,
    color: theme.text,
    cursor: busy ? 'not-allowed' : 'pointer',
    opacity: busy ? 0.6 : 1,
    fontFamily: 'inherit',
  };

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-2xl shadow-xl"
      style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
    >
      <span className="text-sm font-medium pr-2" style={{ color: theme.text }}>
        {ids.size} selected
      </span>
      <button style={btnStyle} disabled={busy} onClick={() => setFavoriteAll(true)}>★ Favorite</button>
      <button style={btnStyle} disabled={busy} onClick={() => setFavoriteAll(false)}>Unfavorite</button>
      <button style={btnStyle} disabled={busy} onClick={download}>Download zip</button>
      <button
        style={{ ...btnStyle, background: 'transparent', color: theme.text2 }}
        onClick={onClear}
      >
        Cancel
      </button>
    </div>
  );
}
