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

      await setCurrentProject(id);
      setIsReady(true);

      // 2단계: 최근 편집 씬 찾아서 본문 로드 우선순위 주기
      const lastScene = await db.scenes
        .where('projectId').equals(id)
        .sortBy('updatedAt')
        .then(scenes => scenes.reverse()[0]);

      if (lastScene) {
        const sceneId = lastScene.id;
        setTimeout(() => {
          import('@/store/uiStore').then(m => m.useUiStore.getState().setCurrentScene(sceneId));
        }, 0);
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
