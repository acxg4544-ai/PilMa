import { create } from 'zustand';

interface BinderState {
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  setExpandedIds: (ids: Set<string>) => void;
  isRenamingId: string | null;
  setIsRenamingId: (id: string | null) => void;
}

const STORAGE_KEY = 'pilma_binder_expanded';

const getInitialExpanded = (): Set<string> => {
  if (typeof window === 'undefined') return new Set(['default-volume', 'default-chapter']);
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return new Set(JSON.parse(saved));
    }
  } catch (e) {
    console.warn('Failed to load binder expansion state', e);
  }
  return new Set(['default-volume', 'default-chapter']);
};

export const useBinderStore = create<BinderState>((set) => ({
  expandedIds: getInitialExpanded(),
  toggleExpanded: (id) => set((state) => {
    const newSet = new Set(state.expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
    return { expandedIds: newSet };
  }),
  setExpandedIds: (ids) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
    set({ expandedIds: ids });
  },
  isRenamingId: null,
  setIsRenamingId: (id) => set({ isRenamingId: id }),
}));
