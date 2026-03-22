'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useBinderStore } from '@/store/binderStore';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { BinderItem } from './BinderItem';
import { FolderPlus, Settings } from 'lucide-react';
import { nanoid } from 'nanoid';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export function Binder() {
  const { expandedIds, isRenamingId, setIsRenamingId } = useBinderStore();
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  
  const projects = useLiveQuery(() => currentProjectId ? db.projects.where('id').equals(currentProjectId).toArray() : []);
  const volumes = useLiveQuery(() => currentProjectId ? db.volumes.where('projectId').equals(currentProjectId).toArray().then(items => items.sort((a, b) => a.order - b.order)) : []);
  const chapters = useLiveQuery(() => db.chapters.toArray().then(items => items.sort((a, b) => a.order - b.order)));
  const scenes = useLiveQuery(() => db.scenes.toArray().then(items => items.sort((a, b) => a.order - b.order)));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeType = activeId.split('-')[0];
    const overType = overId.split('-')[0];

    // 볼륨 이동
    if (activeType === 'vol' && overType === 'vol') {
      const activeVol = volumes?.find(v => v.id === activeId);
      const overVol = volumes?.find(v => v.id === overId);
      if (!activeVol || !overVol) return;

      const oldIndex = volumes!.findIndex(v => v.id === activeId);
      const newIndex = volumes!.findIndex(v => v.id === overId);
      const newVols = arrayMove(volumes!, oldIndex, newIndex);
      await Promise.all(newVols.map((v, i) => db.volumes.update(v.id, { order: i + 1 })));
      return;
    }

    // 챕터 이동
    if (activeType === 'chapter') {
      const activeCh = chapters?.find(c => c.id === activeId);
      if (!activeCh) return;

      if (overType === 'chapter') {
        const overCh = chapters!.find(c => c.id === overId);
        if (!overCh) return;

        if (activeCh.volumeId === overCh.volumeId) {
          const vChs = chapters!.filter(c => c.volumeId === activeCh.volumeId);
          const oldIndex = vChs.findIndex(c => c.id === activeId);
          const newIndex = vChs.findIndex(c => c.id === overId);
          const newChs = arrayMove(vChs, oldIndex, newIndex);
          await Promise.all(newChs.map((c, i) => db.chapters.update(c.id, { order: i + 1 })));
        } else {
          // 다른 볼륨의 챕터 위로 드롭 => 소속 변경 및 순서 삽입
          const vChs = chapters!.filter(c => c.volumeId === overCh.volumeId);
          const targetIndex = vChs.findIndex(c => c.id === overId);
          vChs.splice(targetIndex, 0, activeCh);
          await db.chapters.update(activeId, { volumeId: overCh.volumeId });
          await Promise.all(vChs.map((c, i) => db.chapters.update(c.id, { order: i + 1 })));
        }
      } else if (overType === 'vol') {
        const vChs = chapters!.filter(c => c.volumeId === overId);
        const maxOrder = vChs.length > 0 ? Math.max(...vChs.map(c => c.order)) : 0;
        await db.chapters.update(activeId, { volumeId: overId, order: maxOrder + 1 });
      }
      return;
    }

    // 씬 이동
    if (activeType === 'scene') {
      const activeSc = scenes?.find(s => s.id === activeId);
      if (!activeSc) return;

      if (overType === 'scene') {
        const overSc = scenes!.find(s => s.id === overId);
        if (!overSc) return;

        if (activeSc.chapterId === overSc.chapterId) {
          const cScs = scenes!.filter(s => s.chapterId === activeSc.chapterId);
          const oldIndex = cScs.findIndex(s => s.id === activeId);
          const newIndex = cScs.findIndex(s => s.id === overId);
          const newScs = arrayMove(cScs, oldIndex, newIndex);
          await Promise.all(newScs.map((s, i) => db.scenes.update(s.id, { order: i + 1 })));
        } else {
          // 다른 챕터로 이동
          const cScs = scenes!.filter(s => s.chapterId === overSc.chapterId);
          const targetIndex = cScs.findIndex(s => s.id === overId);
          cScs.splice(targetIndex, 0, activeSc);
          await db.scenes.update(activeId, { chapterId: overSc.chapterId });
          await Promise.all(cScs.map((s, i) => db.scenes.update(s.id, { order: i + 1 })));
        }
      } else if (overType === 'chapter') {
        const cScs = scenes!.filter(s => s.chapterId === overId);
        const maxOrder = cScs.length > 0 ? Math.max(...cScs.map(s => s.order)) : 0;
        await db.scenes.update(activeId, { chapterId: overId, order: maxOrder + 1 });
      }
      return;
    }
  };

  const addVolume = async () => {
    if (!currentProjectId) return;
    const count = await db.volumes.where('projectId').equals(currentProjectId).count();
    await db.volumes.put({
      id: `vol-${crypto.randomUUID()}`,
      projectId: currentProjectId,
      title: '새 권',
      order: count + 1,
    });
  };

  const updateProjectTitle = async (id: string, newTitle: string) => {
    await db.projects.update(id, { title: newTitle });
    setIsRenamingId(null);
  };

  const BinderSkeleton = () => (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-4 bg-[var(--bg-hover)] rounded w-1/2 mb-6 opacity-20" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[var(--bg-hover)] rounded opacity-20" />
          <div className="h-3 bg-[var(--bg-hover)] rounded w-2/3 opacity-20" />
        </div>
      ))}
    </div>
  );

  if (!projects || !volumes || !chapters || !scenes) return <BinderSkeleton />;

  const project = projects[0];

  const getChapterWordCount = (chapterId: string) => {
    return scenes?.filter(s => s.chapterId === chapterId).reduce((sum, s) => sum + (s.wordCount || 0), 0) || 0;
  };

  const getVolumeWordCount = (volumeId: string) => {
    const vChapters = chapters?.filter(ch => ch.volumeId === volumeId) || [];
    return vChapters.reduce((sum, ch) => sum + getChapterWordCount(ch.id), 0);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      
      {/* 프로젝트 헤더 */}
      {project && (
        <div 
          className="px-4 py-2.5 group flex items-center justify-between border-b border-[var(--divider)]"
          onDoubleClick={() => setIsRenamingId(project.id)}
        >
          {isRenamingId === project.id ? (
            <input
              autoFocus
              defaultValue={project.title}
              onBlur={(e) => updateProjectTitle(project.id, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateProjectTitle(project.id, e.currentTarget.value)}
              className="bg-[var(--bg-card)] border border-[var(--accent)] rounded-lg px-2 py-1 text-sm w-full outline-none text-[var(--text-primary)]"
            />
          ) : (
            <h2 className="text-[11px] font-bold text-[var(--text-secondary)] tracking-widest truncate cursor-text uppercase select-none">{project.title}</h2>
          )}
          <Settings size={13} className="text-[var(--text-disabled)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-[var(--text-secondary)]" />
        </div>
      )}

      {/* 스크롤 가능한 트리 영역 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={volumes.map(v => v.id)} strategy={verticalListSortingStrategy}>
            {volumes.map((volume) => {
              const volumeChapters = chapters?.filter(ch => ch.volumeId === volume.id) || [];
              const isVolumeExpanded = expandedIds.has(volume.id);
              
              return (
                <div key={volume.id}>
                  <BinderItem
                    id={volume.id}
                    type="volume"
                    title={volume.title}
                    level={0}
                    icon={volume.icon}
                    isExpanded={isVolumeExpanded}
                    wordCount={getVolumeWordCount(volume.id)}
                  >
                    <div>
                      <SortableContext items={volumeChapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {volumeChapters.map((chapter) => {
                          const chapterScenes = scenes?.filter(s => s.chapterId === chapter.id) || [];
                          const isChapterExpanded = expandedIds.has(chapter.id);
                          
                          return (
                            <div key={chapter.id}>
                              <BinderItem
                                id={chapter.id}
                                type="chapter"
                                title={chapter.title}
                                level={1}
                                icon={chapter.icon}
                                isExpanded={isChapterExpanded}
                                wordCount={getChapterWordCount(chapter.id)}
                              >
                                <div>
                                  <SortableContext items={chapterScenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                    {chapterScenes.map((scene) => (
                                      <BinderItem
                                        key={scene.id}
                                        id={scene.id}
                                        type="scene"
                                        title={scene.title}
                                        icon={scene.icon}
                                        level={2}
                                        wordCount={scene.wordCount}
                                      />
                                    ))}
                                  </SortableContext>
                                </div>
                              </BinderItem>
                            </div>
                          );
                        })}
                      </SortableContext>
                    </div>
                  </BinderItem>
                </div>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {/* 바인더 하단 액션 */}
      <div className="p-3 border-t border-[var(--divider)]">
        <button 
          onClick={addVolume}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--accent)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all w-full justify-center"
        >
          <FolderPlus size={14} />
          <span>새 권 추가</span>
        </button>
      </div>
    </div>
  );
}
