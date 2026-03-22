'use client';

import { useEffect, useRef } from 'react';
import { db } from '@/lib/db';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';

export function useAutoSave() {
  const currentSceneId = useUiStore((state) => state.currentSceneId);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const setSaveStatus = useUiStore((state) => state.setSaveStatus);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveToDb = async (content: any, wordCount: number, plot: string) => {
    if (!currentSceneId) return;

    try {
      setSaveStatus('saving');
      await db.scenes.update(currentSceneId, {
        projectId: currentProjectId || undefined,
        content,
        wordCount,
        plot,
        updatedAt: Date.now(),
      });
      setSaveStatus('saved');
    } catch (error) {
      console.error('AutoSave Error:', error);
      setSaveStatus('idle');
    }
  };

  const triggerAutoSave = (content: any, wordCount: number, plot: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveToDb(content, wordCount, plot);
    }, 1000);
  };

  return { triggerAutoSave };
}
