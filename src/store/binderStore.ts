import { create } from 'zustand';

interface BinderState {
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  isRenamingId: string | null;
  setIsRenamingId: (id: string | null) => void;
}

export const useBinderStore = create<BinderState>((set) => ({
  expandedIds: new Set(['default-volume', 'default-chapter']), // Default expanded
  toggleExpanded: (id) => set((state) => {
    const newSet = new Set(state.expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { expandedIds: newSet };
  }),
  isRenamingId: null,
  setIsRenamingId: (id) => set({ isRenamingId: id }),
}));
