import { create } from 'zustand';
import { Project, db } from '@/lib/db';
import { useAiStore } from './aiStore';

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  setCurrentProject: (id: string | null) => Promise<void>;
  loadProjects: () => Promise<void>;
  loadAITools: (id: string) => Promise<void>;
  addProject: (title: string) => Promise<string>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  setCurrentProject: async (id) => {
    set({ currentProjectId: id });
    const aiStore = useAiStore.getState();
    aiStore.setWorldContext([]);
    // AI 캐시와 프롬프트는 loadAITools에서 별도로 로드하여 초기 로딩 속도 개선
    if (!id) {
      aiStore.setActiveCache(null, null);
    }
  },
  loadAITools: async (id) => {
    const aiStore = useAiStore.getState();
    
    // 요약 캐시 세팅
    const cache = await db.ai_cache.get(id);
    if (cache) {
      aiStore.setActiveCache(cache.summary, cache.geminiFileUri);
    } else {
      aiStore.setActiveCache(null, null);
    }
    
    // 프롬프트 슬롯 로드
    const presets = await db.prompt_presets.where('projectId').equals(id).toArray();
    if (presets.length > 0) {
      const presetMap: Record<number, string> = { ...aiStore.promptPresets };
      for (const p of presets) {
        presetMap[p.slot] = p.prompt;
      }
      aiStore.setPromptPresets(presetMap);
    }
  },
  loadProjects: async () => {
    const projects = await db.projects.toArray();
    projects.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ projects });
  },
  addProject: async (title) => {
    const id = crypto.randomUUID();
    const newProject: Project = {
      id,
      title,
      description: '',
      tags: [],
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.projects.put(newProject);
    await get().loadProjects();
    return id;
  },
  updateProject: async (id, data) => {
    await db.projects.update(id, { ...data, updatedAt: Date.now() });
    await get().loadProjects();
  },
  deleteProject: async (id) => {
    await db.projects.delete(id);
    const vols = await db.volumes.where('projectId').equals(id).toArray();
    for (const v of vols) {
      const chaps = await db.chapters.where('volumeId').equals(v.id).toArray();
      for (const c of chaps) {
        await db.scenes.where('chapterId').equals(c.id).delete();
      }
      await db.chapters.where('volumeId').equals(v.id).delete();
    }
    await db.volumes.where('projectId').equals(id).delete();
    await db.ai_cache.where('id').equals(id).delete();
    await db.prompt_presets.where('projectId').equals(id).delete();
    await get().loadProjects();
  }
}));
