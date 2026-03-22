import { create } from 'zustand';
import { Project, db } from '@/lib/db';
import { useAiStore } from './aiStore';
import { supabase } from '@/lib/supabase';

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  setCurrentProject: (id: string | null) => Promise<void>;
  loadProjects: () => Promise<void>;
  loadAITools: (id: string) => Promise<void>;
  addProject: (title: string) => Promise<string>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  syncProjects: (userId: string) => Promise<void>;
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
  },
  syncProjects: async (userId) => {
    try {
      // Supabase에서 작품 목록 가져오기
      const { data: remoteProjects, error } = await supabase
        .from('bnw_projects')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (!remoteProjects || remoteProjects.length === 0) return;

      // IndexedDB에 동기화
      for (const rp of (remoteProjects as any[])) {
        const local = await db.projects.get(rp.id);
        
        const remoteUpdatedAt = typeof rp.updated_at === 'string' ? new Date(rp.updated_at).getTime() : rp.updated_at;
        const remoteCreatedAt = typeof rp.created_at === 'string' ? new Date(rp.created_at).getTime() : rp.created_at;

        // 로컬에 없거나, 원격의 수정 시간이 더 최신이면 로컬에 반영
        if (!local || remoteUpdatedAt > local.updatedAt) {
          await db.projects.put({
            id: rp.id,
            title: rp.title,
            description: rp.description || '',
            tags: rp.tags || [],
            isFavorite: rp.is_favorite || false,
            coverUrl: rp.cover_url || rp.coverUrl || local?.coverUrl || undefined,
            createdAt: remoteCreatedAt,
            updatedAt: remoteUpdatedAt,
          });
        }
      }

      await get().loadProjects();
    } catch (err) {
      console.error('Failed to sync projects:', err);
    }
  }
}));
