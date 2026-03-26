import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  wordCount: number;
  setWordCount: (count: number) => void;
  currentProjectId: string | null;
  currentSceneId: string | null;
  saveStatus: 'idle' | 'saving' | 'saved';
  setCurrentProject: (id: string | null) => void;
  setCurrentScene: (id: string | null) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved') => void;

  // 레이아웃 추가 상태 (리사이즈 & PIP)
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  aiPanelWidth: number;
  setAiPanelWidth: (width: number) => void;

  editorPipMode: boolean;
  setEditorPipMode: (mode: boolean) => void;
  aiPanelPipMode: boolean;
  setAiPanelPipMode: (mode: boolean) => void;

  editorPipPosition: { x: number; y: number; w: number; h: number };
  setEditorPipPosition: (pos: { x: number; y: number; w: number; h: number }) => void;
  aiPanelPipPosition: { x: number; y: number; w: number; h: number };
  setAiPanelPipPosition: (pos: { x: number; y: number; w: number; h: number }) => void;

  // 에디터 프리셋 상태 ('default' | 'munpia' | 'kakaopage' | 'novelpia' | 'wide')
  editorPreset: string;
  setEditorPreset: (preset: string) => void;

  // 에디터 줌 레벨 (80 ~ 250)
  zoomLevel: number;
  setZoomLevel: (level: number) => void;

  // 에디팅 옵션
  smartQuotes: boolean;
  setSmartQuotes: (enabled: boolean) => void;
  typewriterMode: boolean;
  setTypewriterMode: (enabled: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      wordCount: 0,
      setWordCount: (count) => set({ wordCount: count }),
      currentProjectId: null,
      currentSceneId: null,
      saveStatus: 'idle',
      setCurrentProject: (id) => set({ currentProjectId: id }),
      setCurrentScene: (id) => set({ currentSceneId: id }),
      setSaveStatus: (status) => {
        set({ saveStatus: status });
        if (status === 'saved') {
          setTimeout(() => {
            set((state) => ({ saveStatus: state.saveStatus === 'saved' ? 'idle' : state.saveStatus }));
          }, 2000);
        }
      },

      // 레이아웃 기본값
      sidebarWidth: 260,
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      aiPanelWidth: 340,
      setAiPanelWidth: (width) => set({ aiPanelWidth: width }),

      editorPipMode: false,
      setEditorPipMode: (mode) => set({ editorPipMode: mode }),
      aiPanelPipMode: false,
      setAiPanelPipMode: (mode) => set({ aiPanelPipMode: mode }),

      editorPipPosition: { x: 50, y: 50, w: 760, h: 500 },
      setEditorPipPosition: (pos) => set({ editorPipPosition: pos }),
      aiPanelPipPosition: { x: 100, y: 100, w: 400, h: 600 },
      setAiPanelPipPosition: (pos) => set({ aiPanelPipPosition: pos }),

      // 에디터 프리셋 기본값 'default'
      editorPreset: 'default',
      setEditorPreset: (preset) => set({ editorPreset: preset }),

      // 줌 레벨 기본값 100
      zoomLevel: 100,
      setZoomLevel: (level) => set({ zoomLevel: Math.min(250, Math.max(80, level)) }),

      // 에디팅 옵션 기본값
      smartQuotes: false,
      setSmartQuotes: (enabled) => set({ smartQuotes: enabled }),
      typewriterMode: false,
      setTypewriterMode: (enabled) => set({ typewriterMode: enabled }),
      searchTerm: '',
      setSearchTerm: (term) => set({ searchTerm: term }),
    }),
    {
      name: 'pilma-layout-storage',
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        aiPanelWidth: state.aiPanelWidth,
        editorPipMode: state.editorPipMode,
        aiPanelPipMode: state.aiPanelPipMode,
        editorPipPosition: state.editorPipPosition,
        aiPanelPipPosition: state.aiPanelPipPosition,
        editorPreset: state.editorPreset,
        zoomLevel: state.zoomLevel,
        smartQuotes: state.smartQuotes,
        typewriterMode: state.typewriterMode,
      }),
    }
  )
);
