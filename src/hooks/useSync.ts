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
   * Push: IndexedDB → Supabase (스마트 Push)
   */
  const pushToCloud = useCallback(async () => {
    if (!user) return;
    setSyncStatus('pushing');
    try {
      const userId = user.id;

      // 1. 모든 로컬 데이터 가져오기
      const [localProjects, localVolumes, localChapters, localScenes] = await Promise.all([
        db.projects.toArray(),
        db.volumes.toArray(),
        db.chapters.toArray(),
        db.scenes.toArray(),
      ]);

      // 2. 서버 메타데이터 가져오기 (timestamps 비교용)
      const [{ data: remoteProjects }, { data: remoteVolumes }, { data: remoteChapters }, { data: remoteScenes }] =
        await Promise.all([
          supabase.from('bnw_projects').select('id, updated_at').eq('user_id', userId),
          supabase.from('bnw_volumes').select('id, updated_at').eq('user_id', userId),
          supabase.from('bnw_chapters').select('id, updated_at').eq('user_id', userId),
          supabase.from('bnw_scenes').select('id, updated_at').eq('user_id', userId),
        ]);

      const remotePMap = new Map((remoteProjects as any[] || []).map(p => [p.id, new Date(p.updated_at).getTime()]));
      const remoteVMap = new Map((remoteVolumes as any[] || []).map(v => [v.id, new Date(v.updated_at).getTime()]));
      const remoteCMap = new Map((remoteChapters as any[] || []).map(c => [c.id, new Date(c.updated_at).getTime()]));
      const remoteSMap = new Map((remoteScenes as any[] || []).map(s => [s.id, new Date(s.updated_at).getTime()]));

      // 3. 로컬이 최신인 항목만 필터링
      const pToPush = localProjects.filter(p => !remotePMap.has(p.id) || p.updatedAt > remotePMap.get(p.id)!);
      const vToPush = localVolumes.filter(v => !remoteVMap.has(v.id) || (v as any).updatedAt > remoteVMap.get(v.id)!); 
      const cToPush = localChapters.filter(c => !remoteCMap.has(c.id) || (c as any).updatedAt > remoteCMap.get(c.id)!);
      const sToPush = localScenes.filter(s => !remoteSMap.has(s.id) || s.updatedAt > remoteSMap.get(s.id)!);

      // 4. 프로젝트 upsert
      if (pToPush.length > 0) {
        const { error } = await (supabase.from('bnw_projects') as any).upsert(
          pToPush.map((p) => ({
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
        if (error) throw new Error(`projects push 실패: ${error.message}`);
      }

      // 5. 권(Volume) upsert
      if (vToPush.length > 0) {
        const { error } = await (supabase.from('bnw_volumes') as any).upsert(
          vToPush.map((v) => ({
            id: v.id,
            project_id: v.projectId,
            user_id: userId,
            title: v.title,
            order: v.order,
            updated_at: new Date((v as any).updatedAt || Date.now()).toISOString(),
          })) as any[],
          { onConflict: 'id' }
        );
        if (error) throw new Error(`volumes push 실패: ${error.message}`);
      }

      // 6. 챕터 upsert
      if (cToPush.length > 0) {
        const { error } = await (supabase.from('bnw_chapters') as any).upsert(
          cToPush.map((c) => ({
            id: c.id,
            volume_id: c.volumeId,
            user_id: userId,
            title: c.title,
            order: c.order,
            updated_at: new Date((c as any).updatedAt || Date.now()).toISOString(),
          })) as any[],
          { onConflict: 'id' }
        );
        if (error) throw new Error(`chapters push 실패: ${error.message}`);
      }

      // 7. 씬 upsert
      if (sToPush.length > 0) {
        const { error } = await (supabase.from('bnw_scenes') as any).upsert(
          sToPush.map((s) => ({
            id: s.id,
            project_id: s.projectId,
            chapter_id: s.chapterId,
            user_id: userId,
            title: s.title,
            order: s.order,
            content: s.content,
            word_count: s.wordCount,
            created_at: new Date(s.createdAt).toISOString(),
            updated_at: new Date(s.updatedAt).toISOString(),
          })) as any[],
          { onConflict: 'id' }
        );
        if (error) throw new Error(`scenes push 실패: ${error.message}`);
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
   * Pull: Supabase → IndexedDB (스마트 Pull)
   */
  const pullFromCloud = useCallback(async () => {
    if (!user) return;

    setSyncStatus('pulling');
    try {
      const userId = user.id;

      // 1. 서버 데이터 fetch
      const [{ data: projects }, { data: volumes }, { data: chapters }, { data: scenes }] =
        await Promise.all([
          supabase.from('bnw_projects').select('*').eq('user_id', userId),
          supabase.from('bnw_volumes').select('*').eq('user_id', userId),
          supabase.from('bnw_chapters').select('*').eq('user_id', userId),
          supabase.from('bnw_scenes').select('*').eq('user_id', userId),
        ]);

      if (!projects || !scenes) {
        setSyncStatus('idle');
        return;
      }

      // 2. 동기화 실행 (트랜잭션 대신 개별 비교로 안전 장치 마련)
      for (const p of (projects as any[])) {
        const local = await db.projects.get(p.id);
        const serverUpdatedAt = new Date(p.updated_at).getTime();
        if (!local || serverUpdatedAt > local.updatedAt) {
           await db.projects.put({
              id: p.id,
              title: p.title,
              description: p.description || '',
              coverUrl: p.cover_url || undefined,
              tags: p.tags || [],
              isFavorite: p.is_favorite || false,
              createdAt: new Date(p.created_at).getTime(),
              updatedAt: serverUpdatedAt,
           });
        }
      }

      if (volumes) {
        for (const v of (volumes as any[])) {
           await db.volumes.put({
              id: v.id,
              projectId: v.project_id,
              title: v.title,
              order: v.order,
              updatedAt: new Date(v.updated_at || Date.now()).getTime(),
           });
        }
      }

      if (chapters) {
        for (const c of (chapters as any[])) {
           await db.chapters.put({
              id: c.id,
              volumeId: c.volume_id,
              title: c.title,
              order: c.order,
              updatedAt: new Date(c.updated_at || Date.now()).getTime(),
           });
        }
      }

      // 씬 데이터 비교 (데이터 유실 방지 로직)
      for (const s of (scenes as any[])) {
        const local = await db.scenes.get(s.id);
        const serverUpdatedAt = new Date(s.updated_at).getTime();
        
        // 서버가 더 최신일 때만 업데이트 시도
        if (!local || serverUpdatedAt > local.updatedAt) {
          
          // 데이터 유실 방지: 서버 내용이 로컬보다 50% 이상 짧은 경우 확인
          if (local && s.content && local.content) {
             const serverLen = JSON.stringify(s.content).length;
             const localLen = JSON.stringify(local.content).length;
             
             if (serverLen < localLen * 0.5) {
                const confirmed = window.confirm(
                   `[데이터 유실 주의]\n\n씬 "${s.title}"의 서버 데이터(${s.word_count}자)가 로컬(${local.wordCount}자)보다 현저히 짧습니다.\n서버 데이터가 더 최신 시간으로 기록되어 있습니다.\n\n서버 데이터로 덮어쓰시겠습니까?`
                );
                if (!confirmed) continue; // 이 항목은 건너뜀
             }
          }

          await db.scenes.put({
            id: s.id,
            projectId: s.project_id,
            chapterId: s.chapter_id,
            title: s.title,
            order: s.order,
            content: s.content,
            wordCount: s.word_count,
            createdAt: new Date(s.created_at).getTime(),
            updatedAt: serverUpdatedAt,
          });
        }
      }

      setLastSyncedAt(new Date());
      setSuccessAndReset();
      // Pull 성공 후 페이지 새로고침
      window.location.reload();
    } catch (err) {
      setSyncStatus('error');
      showErrorDialog('클라우드 Pull', err);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [user, setSuccessAndReset]);

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
