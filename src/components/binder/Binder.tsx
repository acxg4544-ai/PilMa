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
  pointerWithin,
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
  
  const projects = useLiveQuery(() => currentProjectId ? db.projects.where('id').equals(currentProjectId).toArray() : [], [currentProjectId]);
  const volumes = useLiveQuery(() => currentProjectId ? db.volumes.where('projectId').equals(currentProjectId).toArray().then(items => items.sort((a, b) => a.order - b.order)) : [], [currentProjectId]);
  const chapters = useLiveQuery(async () => {
    if (!currentProjectId) return [];
    const vols = await db.volumes.where('projectId').equals(currentProjectId).toArray();
    const volIds = vols.map(v => v.id);
    if (volIds.length === 0) return [];
    return db.chapters.where('volumeId').anyOf(volIds).toArray().then(items => items.sort((a, b) => a.order - b.order));
  }, [currentProjectId]);
  const scenes = useLiveQuery(async () => {
    if (!currentProjectId) return [];
    const vols = await db.volumes.where('projectId').equals(currentProjectId).toArray();
    const volIds = vols.map(v => v.id);
    if (volIds.length === 0) return [];
    const chs = await db.chapters.where('volumeId').anyOf(volIds).toArray();
    const chIds = chs.map(c => c.id);
    if (chIds.length === 0) return [];
    return db.scenes.where('chapterId').anyOf(chIds).toArray().then(items => items.sort((a, b) => a.order - b.order));
  }, [currentProjectId]);

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

    // 볼륨 이동: over가 챕터나 씬일 경우 해당 부모 볼륨을 타겟으로 함
    if (activeType === 'vol') {
      let targetOverId = overId;
      if (overType === 'scene') {
        const overSc = scenes?.find(s => s.id === overId);
        if (overSc) {
          const overCh = chapters?.find(c => c.id === overSc.chapterId);
          if (overCh) targetOverId = overCh.volumeId;
        }
      } else if (overType === 'chapter') {
        const overCh = chapters?.find(c => c.id === overId);
        if (overCh) targetOverId = overCh.volumeId;
      }

      if (targetOverId && targetOverId !== activeId) {
        const activeVol = volumes?.find(v => v.id === activeId);
        const overVol = volumes?.find(v => v.id === targetOverId);
        if (activeVol && overVol) {
          const oldIndex = volumes!.findIndex(v => v.id === activeId);
          const newIndex = volumes!.findIndex(v => v.id === targetOverId);
          const newVols = arrayMove(volumes!, oldIndex, newIndex);
          await Promise.all(newVols.map((v, i) => db.volumes.update(v.id, { order: i + 1 })));
        }
      }
      return;
    }

    // 챕터 이동: over가 씬일 경우 해당 씬의 부모 챕터를 타겟으로 함
    if (activeType === 'chapter') {
      const activeCh = chapters?.find(c => c.id === activeId);
      if (!activeCh) return;

      let targetOverId = overId;
      let targetOverType = overType;

      if (overType === 'scene') {
        const overSc = scenes?.find(s => s.id === overId);
        if (overSc) {
          targetOverId = overSc.chapterId;
          targetOverType = 'chapter';
        }
      }

      if (targetOverType === 'chapter') {
        const overCh = chapters!.find(c => c.id === targetOverId);
        if (!overCh) return;

        if (activeCh.volumeId === overCh.volumeId) {
          const vChs = chapters!.filter(c => c.volumeId === activeCh.volumeId);
          const oldIndex = vChs.findIndex(c => c.id === activeId);
          const newIndex = vChs.findIndex(c => c.id === targetOverId);
          const newChs = arrayMove(vChs, oldIndex, newIndex);
          await Promise.all(newChs.map((c, i) => db.chapters.update(c.id, { order: i + 1 })));
        } else {
          // 다른 볼륨의 챕터 위로 드롭 => 소속 변경 및 순서 삽입
          const vChs = chapters!.filter(c => c.volumeId === overCh.volumeId);
          const targetIndex = vChs.findIndex(c => c.id === targetOverId);
          vChs.splice(targetIndex, 0, activeCh);
          await db.chapters.update(activeId, { volumeId: overCh.volumeId });
          await Promise.all(vChs.map((c, i) => db.chapters.update(c.id, { order: i + 1 })));
        }
      } else if (targetOverType === 'vol') {
        const vChs = chapters!.filter(c => c.volumeId === targetOverId);
        const maxOrder = vChs.length > 0 ? Math.max(...vChs.map(c => c.order)) : 0;
        await db.chapters.update(activeId, { volumeId: targetOverId, order: maxOrder + 1 });
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
      <style>{`
        /* 모든 BinderItem의 텍스트 색상을 기본적으로 밝게 보장하고, opacity 1을 강제함 */
        .group.flex.items-center.justify-between {
          color: var(--text-primary) !important;
        }
        .group.flex.items-center.justify-between span.truncate {
          opacity: 1 !important;
          color: var(--text-primary) !important;
        }
        
        /* Drag 중인 요소는 dnd-kit가 inline style로 opacity 등을 설정함. 
           명확하게 투명도 0.5 적용되도록 보장 */
        div[style*="opacity: 0.5"] .group {
          opacity: 0.5 !important;
        }
        
        /* 볼륨 간 드래그 시 파란 라인 표시용 (isOver 스타일 덮어쓰기) */
        .ring-2.ring-\\[var\\(--accent\\)\\] {
          border: 2px solid var(--accent) !important;
          box-shadow: none !important;
        }
      `}</style>
      
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
          collisionDetection={pointerWithin}
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
