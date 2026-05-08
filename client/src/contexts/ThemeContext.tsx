import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'stashy-theme';

export interface ThemeDefinition {
  name: string;
  mode: 'light' | 'dark';
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  text2: string;
  accent: string;
  gradient: string;
  previewColors: string[];
}

export const THEMES: ThemeDefinition[] = [
  {
    name: 'Default',
    mode: 'light',
    bg: '#f0f2f5',
    surface: '#ffffff',
    surface2: '#e8eaed',
    border: 'rgba(0,0,0,0.09)',
    text: '#09090b',
    text2: '#71717a',
    accent: '#f43f5e',
    gradient: 'linear-gradient(135deg, #fb7185 0%, #be185d 100%)',
    previewColors: ['#e8eaed', '#d1d5db', '#f43f5e'],
  },
  {
    name: 'Rainbow',
    mode: 'light',
    bg: '#f5f0ff',
    surface: '#ffffff',
    surface2: '#ede9fe',
    border: '#ddd6fe',
    text: '#1a1a2e',
    text2: '#6b5fa0',
    accent: '#7c3aed',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
    previewColors: ['#fce7f3', '#ede9fe', '#dbeafe'],
  },
  {
    name: 'Ocean',
    mode: 'light',
    bg: '#f0f9ff',
    surface: '#ffffff',
    surface2: '#e0f2fe',
    border: '#bae6fd',
    text: '#0c1e3a',
    text2: '#4a6d8c',
    accent: '#0284c7',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0891b2 100%)',
    previewColors: ['#dbeafe', '#e0f7fa', '#bae6fd'],
  },
  {
    name: 'Forest',
    mode: 'light',
    bg: '#f0fdf4',
    surface: '#ffffff',
    surface2: '#dcfce7',
    border: '#bbf7d0',
    text: '#052e16',
    text2: '#4a7c59',
    accent: '#16a34a',
    gradient: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
    previewColors: ['#dcfce7', '#d1fae5', '#a7f3d0'],
  },
  {
    name: 'Sunset',
    mode: 'light',
    bg: '#fffbf0',
    surface: '#ffffff',
    surface2: '#fef3c7',
    border: '#fde68a',
    text: '#1c1009',
    text2: '#92400e',
    accent: '#d97706',
    gradient: 'linear-gradient(135deg, #d97706 0%, #dc2626 100%)',
    previewColors: ['#fef3c7', '#fce7f3', '#fde68a'],
  },
  {
    name: 'Lavender',
    mode: 'light',
    bg: '#faf5ff',
    surface: '#ffffff',
    surface2: '#f3e8ff',
    border: '#e9d5ff',
    text: '#1a0a2e',
    text2: '#7e5aa2',
    accent: '#9333ea',
    gradient: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
    previewColors: ['#f3e8ff', '#fce7f3', '#e9d5ff'],
  },
  {
    name: 'Nord',
    mode: 'light',
    bg: '#eceff4',
    surface: '#ffffff',
    surface2: '#e5e9f0',
    border: '#d8dee9',
    text: '#2e3440',
    text2: '#4c566a',
    accent: '#5e81ac',
    gradient: 'linear-gradient(135deg, #5e81ac 0%, #81a1c1 100%)',
    previewColors: ['#e5e9f0', '#d8dee9', '#5e81ac'],
  },
  {
    name: 'Mono',
    mode: 'light',
    bg: '#f8f9fa',
    surface: '#ffffff',
    surface2: '#f1f3f5',
    border: '#dee2e6',
    text: '#212529',
    text2: '#6c757d',
    accent: '#343a40',
    gradient: 'linear-gradient(135deg, #343a40 0%, #495057 100%)',
    previewColors: ['#f1f3f5', '#e9ecef', '#dee2e6'],
  },
  {
    name: 'Dark',
    mode: 'dark',
    bg: '#0a0a0f',
    surface: '#111118',
    surface2: '#1a1a28',
    border: 'rgba(251,113,133,0.18)',
    text: '#f0f0ff',
    text2: '#8884a8',
    accent: '#fb7185',
    gradient: 'linear-gradient(135deg, #fb7185 0%, #be185d 100%)',
    previewColors: ['#1a1a28', '#2d1b2e', '#fb7185'],
  },
  {
    name: 'Midnight',
    mode: 'dark',
    bg: '#050814',
    surface: '#0d1117',
    surface2: '#161b22',
    border: 'rgba(6,182,212,0.15)',
    text: '#e2f8ff',
    text2: '#7d8ea0',
    accent: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
    previewColors: ['#161b22', '#0d2a35', '#06b6d4'],
  },
];

interface ThemeContextValue {
  dark: boolean;
  theme: ThemeDefinition;
  toggle: () => void;
  setThemeByName: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeDefinition>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return THEMES.find(t => t.name === 'Default') || THEMES[0];
    // Migrations
    if (stored === 'dark') return THEMES.find(t => t.name === 'Dark') || THEMES[0];
    if (stored === 'light') return THEMES[0];
    if (stored === 'Monochrome') return THEMES.find(t => t.name === 'Mono') || THEMES[0];
    if (stored === 'Earth') return THEMES.find(t => t.name === 'Mono') || THEMES[0];
    const found = THEMES.find(t => t.name === stored);
    return found || THEMES[0];
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, theme.name);

    root.style.setProperty('--settings-bg', theme.bg);
    root.style.setProperty('--settings-surface', theme.surface);
    root.style.setProperty('--settings-surface2', theme.surface2);
    root.style.setProperty('--settings-border', theme.border);
    root.style.setProperty('--settings-text', theme.text);
    root.style.setProperty('--settings-text2', theme.text2);
    root.style.setProperty('--settings-accent', theme.accent);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(prev => {
      if (prev.mode === 'dark') return THEMES.find(t => t.name === 'Default') || THEMES[0];
      return THEMES.find(t => t.name === 'Dark') || THEMES[0];
    });
  }, []);

  const setThemeByName = useCallback((name: string) => {
    const found = THEMES.find(t => t.name === name);
    if (found) setTheme(found);
  }, []);

  return (
    <ThemeContext.Provider value={{ dark: theme.mode === 'dark', theme, toggle, setThemeByName }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
