import Dexie, { type Table } from 'dexie';

export interface Project {
  id: string;
  title: string;
  description: string;
  coverUrl?: string; // nullable
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Volume {
  id: string;
  projectId: string;
  title: string;
  order: number;
}

export interface Chapter {
  id: string;
  volumeId: string;
  title: string;
  order: number;
}

export interface Scene {
  id: string;
  projectId?: string; // 추가됨
  chapterId: string;
  title: string;
  order: number;
  content: any; // TipTap JSON document
  plot?: string; // 이번 회차 플롯
  wordCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface AiCache {
  id: string; // projectId
  projectId?: string; // 명시적 추가
  contentHash: string;
  geminiFileUri: string;
  summary: string;
  updatedAt: number;
}

export interface PromptPreset {
  id: string; // e.g. `${projectId}-${slot}`
  projectId: string; // 'global' or actual projectId
  slot: number; // 1 to 5
  prompt: string;
}

export class PilMaDatabase extends Dexie {
  projects!: Table<Project>;
  volumes!: Table<Volume>;
  chapters!: Table<Chapter>;
  scenes!: Table<Scene>;
  ai_cache!: Table<AiCache>;
  prompt_presets!: Table<PromptPreset>;

  constructor() {
    super('pilma-db');
    this.version(1).stores({
      projects: 'id, title, createdAt, updatedAt',
      volumes: 'id, projectId, title, order',
      chapters: 'id, volumeId, title, order',
      scenes: 'id, chapterId, title, order, wordCount, createdAt, updatedAt',
    });
    this.version(2).stores({
      projects: 'id, title, createdAt, updatedAt',
      volumes: 'id, projectId, title, order',
      chapters: 'id, volumeId, title, order',
      scenes: 'id, chapterId, title, order, wordCount, createdAt, updatedAt, plot',
    });
    this.version(3).stores({
      projects: 'id, title, createdAt, updatedAt',
      volumes: 'id, projectId, title, order',
      chapters: 'id, volumeId, title, order',
      scenes: 'id, chapterId, title, order, wordCount, createdAt, updatedAt, plot',
      ai_cache: 'id, contentHash, geminiFileUri, summary, updatedAt',
      prompt_presets: 'id, projectId, slot, prompt',
    });
    this.version(4).stores({
      projects: 'id, title, createdAt, updatedAt',
      volumes: 'id, projectId, title, order',
      chapters: 'id, volumeId, title, order',
      scenes: 'id, projectId, chapterId, title, order, wordCount, createdAt, updatedAt, plot',
      ai_cache: 'id, projectId, contentHash, geminiFileUri, summary, updatedAt',
      prompt_presets: 'id, projectId, slot, prompt',
    });
  }
}

export const db = new PilMaDatabase();

export async function initializeDefaultData() {
  const projectCount = await db.projects.count();
  if (projectCount === 0) {
    // 아무것도 생성하지 않음 (홈 화면에서 유저가 생성하도록 유도)
    return null;
  }
  
  // Return the last modified project/scene
  const lastScene = await db.scenes.orderBy('updatedAt').reverse().first();
  if (lastScene) {
    let projId = lastScene.projectId;
    if (!projId) {
      const chapter = await db.chapters.get(lastScene.chapterId);
      const volume = chapter ? await db.volumes.get(chapter.volumeId) : null;
      projId = volume?.projectId || 'default-project';
    }
    return { 
      projectId: projId, 
      sceneId: lastScene.id 
    };
  }
  
  return null;
}
