import { create } from 'zustand';

interface AiState {
  isAiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;
  toggleAiPanel: () => void;
  suggestions: string[];
  setSuggestions: (suggestions: string[]) => void;
  updateSuggestion: (index: number, content: string) => void;
  isAiLoading: boolean;
  setAiLoading: (loading: boolean) => void;
  aiError: string | null;
  setAiError: (error: string | null) => void;
  lastInsertionRequest: string | null;
  triggerInsert: (content: string) => void;
  clearInsertRequest: () => void;
  // 세계관 문맥 관련
  worldContext: { id: string; title: string; content: string }[];
  setWorldContext: (context: { id: string; title: string; content: string }[]) => void;
  addWorldContext: (card: { id: string; title: string; content: string }) => void;
  addWorldContextBulk: (cards: { id: string; title: string; content: string }[]) => void;
  removeWorldContext: (id: string) => void;
  // 요약 캐시 관련
  activeCacheSummary: string | null;
  activeCacheUri: string | null;
  setActiveCache: (summary: string | null, uri: string | null) => void;
  // 커스텀 프롬프트 관련
  promptPresets: Record<number, string>;
  setPromptPresets: (presets: Record<number, string>) => void;
  lastUsedPrompt: string | null;
  setLastUsedPrompt: (prompt: string | null) => void;
}

export const useAiStore = create<AiState>((set) => ({
  isAiPanelOpen: false,
  setAiPanelOpen: (open) => set({ isAiPanelOpen: open }),
  toggleAiPanel: () => set((state) => ({ isAiPanelOpen: !state.isAiPanelOpen })),
  suggestions: ['', '', ''],
  setSuggestions: (suggestions) => set({ suggestions }),
  updateSuggestion: (index, content) => set((state) => {
    const newSuggestions = [...state.suggestions];
    newSuggestions[index] = content;
    return { suggestions: newSuggestions };
  }),
  isAiLoading: false,
  setAiLoading: (loading) => set({ isAiLoading: loading }),
  aiError: null,
  setAiError: (error) => set({ aiError: error }),
  lastInsertionRequest: null,
  triggerInsert: (content) => set({ lastInsertionRequest: content }),
  clearInsertRequest: () => set({ lastInsertionRequest: null }),
  worldContext: [],
  setWorldContext: (context) => set({ worldContext: context }),
  addWorldContext: (card) => set((state) => {
    if (state.worldContext.some(c => c.id === card.id)) return state;
    return { worldContext: [...state.worldContext, card] };
  }),
  addWorldContextBulk: (cards) => set((state) => {
    const existingIds = new Set(state.worldContext.map(c => c.id));
    const newCards = cards.filter(c => !existingIds.has(c.id));
    return {
      worldContext: [...state.worldContext, ...newCards]
    };
  }),
  removeWorldContext: (id) => set((state) => ({
    worldContext: state.worldContext.filter(c => c.id !== id)
  })),
  activeCacheSummary: null,
  activeCacheUri: null,
  setActiveCache: (summary, uri) => set({ activeCacheSummary: summary, activeCacheUri: uri }),
  promptPresets: {
    1: '대화문을 이어서 써줘',
    2: '지문과 묘사를 이어서 써줘',
    3: '장면을 전환해줘',
    4: '긴장감을 높여서 이어써줘',
    5: '이 장면을 마무리해줘',
  },
  setPromptPresets: (promptPresets) => set({ promptPresets }),
  lastUsedPrompt: null,
  setLastUsedPrompt: (prompt) => set({ lastUsedPrompt: prompt }),
}));
