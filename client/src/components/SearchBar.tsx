import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';

export default function SearchBar() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initial = searchParams.get('q') ?? '';
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the field in sync if the URL is changed externally (e.g. back/forward).
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  // Cmd/Ctrl+K focuses the search field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={submit} className="flex-1 max-w-sm mx-2 sm:mx-4">
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: theme.text2 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search media…"
          aria-label="Search media"
          className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2"
          style={{
            background: theme.surface2,
            color: theme.text,
            border: `1px solid ${theme.border}`,
          }}
        />
      </div>
    </form>
  );
}
