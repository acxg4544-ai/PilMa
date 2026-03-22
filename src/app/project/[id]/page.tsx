'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/projectStore';
import { db } from '@/lib/db';

const EditorSkeleton = () => (
  <div className="w-full h-full p-4 flex flex-col items-center">
    <div className="w-full max-w-[760px] animate-pulse">
      <div className="h-6 bg-[var(--bg-hover)] rounded w-3/4 mb-10 mx-auto opacity-20" />
      <div className="space-y-4">
        <div className="h-4 bg-[var(--bg-hover)] rounded w-full opacity-20" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-full opacity-20" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-5/6 opacity-20" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-full opacity-20" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-4/5 opacity-20" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-full opacity-20" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-3/4 opacity-20" />
      </div>
    </div>
  </div>
);

const EditorComplete = dynamic(() => import('@/components/editor/Editor'), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { setCurrentProject, loadAITools } = useProjectStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    async function initProject() {
      // 1단계: 존재 여부 확인 및 레이아웃 먼저 보여주기
      const project = await db.projects.get(id);
      if (!project) {
        alert('존재하지 않는 작품입니다.');
        router.push('/');
        return;
      }

      // 바인더 확장 상태 초기화
      const binderStore = await import('@/store/binderStore').then(m => m.useBinderStore);
      binderStore.setState({ expandedIds: new Set() });

      await setCurrentProject(id);
      setIsReady(true);

      // 2단계: 최근 편집 씬 찾아서 본문 로드 (없으면 첫 번째 씬)
      const lastScene = await db.scenes
        .where('projectId').equals(id)
        .sortBy('updatedAt')
        .then(scenes => scenes.reverse()[0]);

      if (lastScene) {
        const sceneId = lastScene.id;
        setTimeout(() => {
          import('@/store/uiStore').then(m => m.useUiStore.getState().setCurrentScene(sceneId));
        }, 0);
      } else {
        // 새로 진입 시 projectId 필터링이 안 된 구형 데이터 혹은 projectId 필드가 없는 씬을 위해 챕터를 거쳐 씬을 찾음
        const vols = await db.volumes.where('projectId').equals(id).toArray();
        if (vols.length > 0) {
          vols.sort((a, b) => a.order - b.order);
          const chs = await db.chapters.where('volumeId').equals(vols[0].id).toArray();
          if (chs.length > 0) {
            chs.sort((a, b) => a.order - b.order);
            const scs = await db.scenes.where('chapterId').equals(chs[0].id).toArray();
            if (scs.length > 0) {
              scs.sort((a, b) => a.order - b.order);
              setTimeout(() => {
                import('@/store/uiStore').then(m => m.useUiStore.getState().setCurrentScene(scs[0].id));
              }, 0);
            }
          }
        }
      }

      // 3단계: AI 데이터 백그라운드 로드
      setTimeout(() => {
        loadAITools(id);
      }, 1000);
    }

    initProject();
  }, [id, setCurrentProject, loadAITools, router]);

  if (!isReady) return null;

  return (
    <div className="w-full h-full pb-32">
      <EditorComplete />
    </div>
  );
}
