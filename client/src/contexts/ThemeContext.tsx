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
  previewColors: string[];
}

export const THEMES: ThemeDefinition[] = [
  { name: 'Default', mode: 'light', bg: '#f9fafb', surface: '#ffffff', surface2: '#f3f4f6', border: 'rgba(0,0,0,0.06)', text: '#1a1a2e', text2: '#555', accent: '#e11d48', previewColors: ['#f3f4f6', '#e5e7eb', '#e11d48'] },
  { name: 'Rainbow', mode: 'light', bg: '#f0f2f5', surface: '#ffffff', surface2: '#f5f0ff', border: '#e0d6f0', text: '#1a1a2e', text2: '#6b7084', accent: '#7c3aed', previewColors: ['#fecaca', '#bbf7d0', '#bfdbfe'] },
  { name: 'Ocean', mode: 'light', bg: '#eef2ff', surface: '#ffffff', surface2: '#e0f2fe', border: '#bae6fd', text: '#0c1e3a', text2: '#4a6d8c', accent: '#0284c7', previewColors: ['#dbeafe', '#ccfbf1', '#e0f2fe'] },
  { name: 'Forest', mode: 'light', bg: '#ecfdf5', surface: '#ffffff', surface2: '#d1fae5', border: '#a7f3d0', text: '#1a2e1a', text2: '#4a7c59', accent: '#16a366', previewColors: ['#d1fae5', '#dcfce7', '#bbf7d0'] },
  { name: 'Sunset', mode: 'light', bg: '#fff7ed', surface: '#ffffff', surface2: '#ffedd5', border: '#fed7aa', text: '#2e1a0e', text2: '#8c6a4a', accent: '#ea580c', previewColors: ['#ffe4e6', '#fef3c7', '#fed7aa'] },
  { name: 'Lavender', mode: 'light', bg: '#f3e8ff', surface: '#ffffff', surface2: '#ede9fe', border: '#ddd6fe', text: '#1a1a2e', text2: '#6b6b8a', accent: '#7c3aed', previewColors: ['#ede9fe', '#e9d5ff', '#ddd6fe'] },
  { name: 'Monochrome', mode: 'light', bg: '#ffffff', surface: '#ffffff', surface2: '#f8fafc', border: '#e2e8f0', text: '#1a1a2e', text2: '#64748b', accent: '#475569', previewColors: ['#f8fafc', '#f1f5f9', '#e2e8f0'] },
  { name: 'Nord', mode: 'light', bg: '#eceff4', surface: '#ffffff', surface2: '#e5e9f0', border: '#d8dee9', text: '#2e3440', text2: '#4c566a', accent: '#5e81ac', previewColors: ['#d8dee9', '#e5e9f0', '#dbe4ee'] },
  { name: 'Dark', mode: 'dark', bg: '#111827', surface: '#1f2937', surface2: '#374151', border: '#4b5563', text: '#f3f4f6', text2: '#9ca3af', accent: '#fb7185', previewColors: ['#2d2d44', '#1e3a5f', '#2d1b4e'] },
  { name: 'Earth', mode: 'light', bg: '#faf8f5', surface: '#ffffff', surface2: '#f5f0e8', border: '#e7e0d5', text: '#2e2a1a', text2: '#8a7e6a', accent: '#a16207', previewColors: ['#fef3c7', '#fed7aa', '#d1fae5'] },
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
    // Migration from old 'dark'/'light' values
    if (stored === 'dark') return THEMES.find(t => t.name === 'Dark') || THEMES[0];
    if (stored === 'light') return THEMES[0];
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
      if (prev.mode === 'dark') return THEMES[0]; // switch to Default (light)
      return THEMES.find(t => t.name === 'Dark') || THEMES[0]; // switch to Dark
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
