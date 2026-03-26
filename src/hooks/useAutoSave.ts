'use client';

import { useEffect, useRef } from 'react';
import { db } from '@/lib/db';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';

export function useAutoSave() {
  const currentSceneId = useUiStore((state) => state.currentSceneId);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const setSaveStatus = useUiStore((state) => state.setSaveStatus);
  const lastBackupTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveToDb = async (content: any, wordCount: number, plot: string) => {
    if (!currentSceneId) return;

    try {
      setSaveStatus('saving');
      const now = Date.now();
      await db.scenes.update(currentSceneId, {
        projectId: currentProjectId || undefined,
        content,
        wordCount,
        plot,
        updatedAt: now,
      });

      // 로컬 버전 백업 (localStorage 가용 시) - 30초 간격으로 제한
      if (now - lastBackupTimeRef.current > 30 * 1000) {
        try {
          const backupKey = `pilma_backup_${currentSceneId}`;
          const existing = localStorage.getItem(backupKey);
          let backups = existing ? JSON.parse(existing) : [];
          
          // 10개까지만 유지 (최신순)
          backups.unshift({ content, savedAt: now, charCount: wordCount });
          if (backups.length > 10) {
            backups = backups.slice(0, 10);
          }
          localStorage.setItem(backupKey, JSON.stringify(backups));
          lastBackupTimeRef.current = now;
        } catch (backupError) {
          console.warn('Local backup failed (Storage Full?):', backupError);
        }
      }

      // 프로젝트 최근 수정 시간 갱신 (홈 화면 정렬용)
      if (currentProjectId) {
        await db.projects.update(currentProjectId, { updatedAt: now });
      }

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

    // 최소 3초 debounce 적용
    timeoutRef.current = setTimeout(() => {
      saveToDb(content, wordCount, plot);
    }, 3000);
  };

  return { triggerAutoSave };
}
