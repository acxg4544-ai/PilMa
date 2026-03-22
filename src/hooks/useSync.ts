'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { useAuthStore } from '@/store/authStore';

export type SyncStatus = 'idle' | 'pushing' | 'pulling' | 'success' | 'error';

/**
 * 동기화 훅
 * - IndexedDB ↔ Supabase 동기화
 * - 수동 Push / Pull
 * - 2분마다 자동 Push (로그인 상태에서만)
 */
export function useSync() {
  const { user } = useAuthStore();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 성공 상태 2초 후 idle 복귀
  const setSuccessAndReset = useCallback(() => {
    setSyncStatus('success');
    setTimeout(() => setSyncStatus('idle'), 2000);
  }, []);

  /**
   * 오류 팝업 표시 + 클립보드 복사
   */
  const showErrorDialog = (context: string, err: unknown) => {
    const errMsg = err instanceof Error ? err.message : String(err);
    const log = `[PilMa 동기화 오류]\n컨텍스트: ${context}\n시각: ${new Date().toLocaleString()}\n오류: ${errMsg}`;
    // 팝업에서 확인 누르면 클립보드에 로그 복사
    const confirmed = window.confirm(
      `동기화 오류 발생!\n\n${errMsg}\n\n확인을 누르면 오류 로그가 클립보드에 복사됩니다.`
    );
    if (confirmed) {
      navigator.clipboard?.writeText(log).catch(() => {
        alert(log); // 클립보드 실패 시 텍스트로 표시
      });
    }
  };

  /**
   * Push: IndexedDB → Supabase
   */
  const pushToCloud = useCallback(async () => {
    if (!user) return;
    setSyncStatus('pushing');
    try {
      const userId = user.id;
      const now = new Date().toISOString();

      // 모든 데이터 가져오기
      const [projects, volumes, chapters, scenes] = await Promise.all([
        db.projects.toArray(),
        db.volumes.toArray(),
        db.chapters.toArray(),
        db.scenes.toArray(),
      ]);

      // 프로젝트 upsert
      if (projects.length > 0) {
        const { error } = await (supabase.from('bnw_projects') as any).upsert(
          projects.map((p) => ({
            id: p.id,
            user_id: userId,
            title: p.title,
            description: p.description || '',
            cover_url: p.coverUrl || null,
            tags: p.tags || [],
            is_favorite: p.isFavorite || false,
            created_at: new Date(p.createdAt).toISOString(),
            updated_at: new Date(p.updatedAt).toISOString(),
          })) as any[],
          { onConflict: 'id' }
        );
        if (error) throw new Error(`projects upsert 실패: ${error.message}`);
      }

      // 권(Volume) upsert
      if (volumes.length > 0) {
        const { error } = await (supabase.from('bnw_volumes') as any).upsert(
          volumes.map((v) => ({
            id: v.id,
            project_id: v.projectId,
            user_id: userId,
            title: v.title,
            order: v.order,
            updated_at: now,
          })) as any[],
          { onConflict: 'id' }
        );
        if (error) throw new Error(`volumes upsert 실패: ${error.message}`);
      }

      // 챕터 upsert
      if (chapters.length > 0) {
        const { error } = await (supabase.from('bnw_chapters') as any).upsert(
          chapters.map((c) => ({
            id: c.id,
            volume_id: c.volumeId,
            user_id: userId,
            title: c.title,
            order: c.order,
            updated_at: now,
          })) as any[],
          { onConflict: 'id' }
        );
        if (error) throw new Error(`chapters upsert 실패: ${error.message}`);
      }

      // 씬 upsert
      if (scenes.length > 0) {
        const { error } = await (supabase.from('bnw_scenes') as any).upsert(
          scenes.map((s) => ({
            id: s.id,
            project_id: s.projectId,
            chapter_id: s.chapterId,
            user_id: userId,
            title: s.title,
            order: s.order,
            content: s.content,
            word_count: s.wordCount,
            created_at: new Date(s.createdAt).toISOString(),
            updated_at: now,
          })) as any[],
          { onConflict: 'id' }
        );
        if (error) throw new Error(`scenes upsert 실패: ${error.message}`);
      }

      setLastSyncedAt(new Date());
      setSuccessAndReset();
    } catch (err) {
      setSyncStatus('error');
      showErrorDialog('클라우드 Push', err);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [user, setSuccessAndReset]);

  /**
   * Pull: Supabase → IndexedDB (덮어쓰기)
   */
  const pullFromCloud = useCallback(async () => {
    if (!user) return;

    const confirmed = window.confirm(
      '클라우드 데이터로 로컬을 덮어쓸까요?\n\n⚠️ 현재 로컬의 저장되지 않은 내용이 사라질 수 있습니다.'
    );
    if (!confirmed) return;

    setSyncStatus('pulling');
    try {
      const userId = user.id;

      // 클라우드에서 데이터 fetch
      const [{ data: projects, error: pErr }, { data: volumes, error: vErr }, { data: chapters, error: cErr }, { data: scenes, error: sErr }] =
        await Promise.all([
          supabase.from('bnw_projects').select('*').eq('user_id', userId),
          supabase.from('bnw_volumes').select('*').eq('user_id', userId),
          supabase.from('bnw_chapters').select('*').eq('user_id', userId),
          supabase.from('bnw_scenes').select('*').eq('user_id', userId),
        ]);

      if (pErr) throw new Error(`projects fetch 실패: ${pErr.message}`);
      if (vErr) throw new Error(`volumes fetch 실패: ${vErr.message}`);
      if (cErr) throw new Error(`chapters fetch 실패: ${cErr.message}`);
      if (sErr) throw new Error(`scenes fetch 실패: ${sErr.message}`);

      // IndexedDB 전체 교체 (트랜잭션)
      await db.transaction('rw', [db.projects, db.volumes, db.chapters, db.scenes], async () => {
        await db.projects.clear();
        await db.volumes.clear();
        await db.chapters.clear();
        await db.scenes.clear();

        if (projects && projects.length > 0) {
          await db.projects.bulkAdd(
            projects.map((p: any) => ({
              id: p.id,
              title: p.title,
              description: p.description || '',
              coverUrl: p.cover_url || undefined,
              tags: p.tags || [],
              isFavorite: p.is_favorite || false,
              createdAt: new Date(p.created_at).getTime(),
              updatedAt: new Date(p.updated_at).getTime(),
            }))
          );
        }

        if (volumes && volumes.length > 0) {
          await db.volumes.bulkAdd(
            volumes.map((v: any) => ({
              id: v.id,
              projectId: v.project_id,
              title: v.title,
              order: v.order,
            }))
          );
        }

        if (chapters && chapters.length > 0) {
          await db.chapters.bulkAdd(
            chapters.map((c: any) => ({
              id: c.id,
              volumeId: c.volume_id,
              title: c.title,
              order: c.order,
            }))
          );
        }

        if (scenes && scenes.length > 0) {
          await db.scenes.bulkAdd(
            scenes.map((s: any) => ({
              id: s.id,
              projectId: s.project_id,
              chapterId: s.chapter_id,
              title: s.title,
              order: s.order,
              content: s.content,
              wordCount: s.word_count,
              createdAt: new Date(s.created_at).getTime(),
              updatedAt: new Date(s.updated_at).getTime(),
            }))
          );
        }
      });

      setLastSyncedAt(new Date());
      // Pull 성공 후 페이지 새로고침
      window.location.reload();
    } catch (err) {
      setSyncStatus('error');
      showErrorDialog('클라우드 Pull', err);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [user]);

  // 2분마다 자동 Push (로그인 상태에서만)
  useEffect(() => {
    if (!user) {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
        autoSyncIntervalRef.current = null;
      }
      return;
    }

    autoSyncIntervalRef.current = setInterval(() => {
      pushToCloud();
    }, 2 * 60 * 1000); // 2분

    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }
    };
  }, [user, pushToCloud]);

  return {
    syncStatus,
    lastSyncedAt,
    pushToCloud,
    pullFromCloud,
  };
}
