import { create } from 'zustand';

export type CategoryMode = 'home' | 'printing' | 'gifting' | 'shopping';

interface CategoryState {
  mode: CategoryMode;
  setMode: (mode: CategoryMode) => void;
}

export const CATEGORY_COLORS: Record<CategoryMode, string> = {
  home: '#000000',
  printing: '#4CA1AF',
  gifting: '#FF7EB3',
  shopping: '#A18CD1',
};

export const useCategoryStore = create<CategoryState>((set) => ({
  mode: 'home',
  setMode: (mode) => set({ mode }),
}));
