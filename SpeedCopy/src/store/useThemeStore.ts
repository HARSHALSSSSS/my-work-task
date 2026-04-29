import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

export interface ThemePalette {
  background: string;
  surface: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  inputBg: string;
  searchBorder: string;
  iconDefault: string;
  chevron: string;
  placeholder: string;
  chipBg: string;
  chipText: string;
  badgeBg: string;
  statusBar: 'light-content' | 'dark-content';
}

const LIGHT: ThemePalette = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#6B6B6B',
  textMuted: '#424242',
  border: '#E0E0E0',
  divider: '#E8E8E8',
  inputBg: '#FFFFFF',
  searchBorder: '#E0E0E0',
  iconDefault: '#424242',
  chevron: '#8F8F8F',
  placeholder: '#A5A5A5',
  chipBg: '#F0F0F0',
  chipText: '#424242',
  badgeBg: '#E8F8EE',
  statusBar: 'dark-content',
};

const DARK: ThemePalette = {
  background: '#121212',
  surface: '#1E1E1E',
  card: '#252525',
  textPrimary: '#EAEAEA',
  textSecondary: '#A0A0A0',
  textMuted: '#B0B0B0',
  border: '#333333',
  divider: '#2C2C2C',
  inputBg: '#252525',
  searchBorder: '#3A3A3A',
  iconDefault: '#C0C0C0',
  chevron: '#707070',
  placeholder: '#666666',
  chipBg: '#2C2C2C',
  chipText: '#C0C0C0',
  badgeBg: '#1A3A25',
  statusBar: 'light-content',
};

interface ThemeState {
  mode: ThemeMode;
  colors: ThemePalette;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  colors: LIGHT,
  toggle: () =>
    set((s) => {
      const next = s.mode === 'light' ? 'dark' : 'light';
      return { mode: next, colors: next === 'light' ? LIGHT : DARK };
    }),
  setMode: (m) => set({ mode: m, colors: m === 'light' ? LIGHT : DARK }),
}));
