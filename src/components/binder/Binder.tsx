'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useBinderStore } from '@/store/binderStore';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { BinderItem } from './BinderItem';
import { FolderPlus, Settings, Search, X } from 'lucide-react';
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

  // 검색 상태
  const [searchTerm, setLocalSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // 씬 텍스트 추출 함수 (TipTap JSON -> Plain Text)
  const extractText = (node: any): string => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.type === 'text') return node.text || '';
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join(node.type === 'paragraph' ? '\n' : ' ');
    }
    return '';
  };

  const handleSearch = (term: string) => {
    setLocalSearchTerm(term);
    if (!term.trim() || !scenes) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const results: any[] = [];
    const lowerTerm = term.toLowerCase();

    scenes.forEach(scene => {
      const titleMatch = scene.title.toLowerCase().includes(lowerTerm);
      const plainText = extractText(scene.content);
      const textMatch = plainText.toLowerCase().includes(lowerTerm);

      if (titleMatch || textMatch) {
        let snippet = '';
        if (textMatch) {
          const index = plainText.toLowerCase().indexOf(lowerTerm);
          const start = Math.max(0, index - 30);
          const end = Math.min(plainText.length, index + term.length + 30);
          snippet = plainText.substring(start, end);
          if (start > 0) snippet = '...' + snippet;
          if (end < plainText.length) snippet = snippet + '...';
        }

        results.push({
          id: scene.id,
          title: scene.title,
          snippet,
          matchCount: (plainText.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length + (titleMatch ? 1 : 0)
        });
      }
    });

    setSearchResults(results);
  };

  const clearSearch = () => {
    setLocalSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const activeSensors = isRenamingId ? [] : sensors;
  const setCurrentScene = useUiStore((state) => state.setCurrentScene);
  const setSearchTerm = useUiStore((state) => state.setSearchTerm);

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
          const now = Date.now();
          await Promise.all(newVols.map((v, i) => db.volumes.update(v.id, { order: i + 1, updatedAt: now })));
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
          // 같은 볼륨 내 순서 변경
          const vChs = chapters!.filter(c => c.volumeId === activeCh.volumeId);
          const oldIndex = vChs.findIndex(c => c.id === activeId);
          const newIndex = vChs.findIndex(c => c.id === targetOverId);
          if (oldIndex !== -1 && newIndex !== -1) {
            const newChs = arrayMove(vChs, oldIndex, newIndex);
            const now = Date.now();
            await Promise.all(newChs.map((c, i) => db.chapters.update(c.id, { order: i + 1, updatedAt: now })));
          }
        } else {
          // 다른 볼륨의 챕터 위로 드롭 => 소속 변경 및 순서 삽입
          const vChs = chapters!.filter(c => c.volumeId === overCh.volumeId);
          const targetIndex = vChs.findIndex(c => c.id === targetOverId);
          if (targetIndex !== -1) {
            vChs.splice(targetIndex, 0, activeCh);
            const now = Date.now();
            await db.chapters.update(activeId, { volumeId: overCh.volumeId, updatedAt: now });
            await Promise.all(vChs.map((c, i) => db.chapters.update(c.id, { order: i + 1, updatedAt: now })));
          }
        }
      } else if (targetOverType === 'vol') {
        // 볼륨 위로 직접 드롭 => 소속 변경 및 마지막으로 이동
        const now = Date.now();
        await db.chapters.update(activeId, { volumeId: targetOverId, order: 9999, updatedAt: now });
        // 다시 순서 정렬
        const vChs = await db.chapters.where('volumeId').equals(targetOverId).toArray();
        vChs.sort((a, b) => a.order - b.order);
        await Promise.all(vChs.map((c, i) => db.chapters.update(c.id, { order: i + 1, updatedAt: now })));
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
          const now = Date.now();
          await Promise.all(newScs.map((s, i) => db.scenes.update(s.id, { order: i + 1, updatedAt: now })));
        } else {
          // 다른 챕터로 이동
          const cScs = scenes!.filter(s => s.chapterId === overSc.chapterId);
          const targetIndex = cScs.findIndex(s => s.id === overId);
          cScs.splice(targetIndex, 0, activeSc);
          const now = Date.now();
          await db.scenes.update(activeId, { chapterId: overSc.chapterId, updatedAt: now });
          await Promise.all(cScs.map((s, i) => db.scenes.update(s.id, { order: i + 1, updatedAt: now })));
        }
      } else if (overType === 'chapter') {
        const cScs = scenes!.filter(s => s.chapterId === overId);
        const maxOrder = cScs.length > 0 ? Math.max(...cScs.map(s => s.order)) : 0;
        await db.scenes.update(activeId, { chapterId: overId, order: maxOrder + 1, updatedAt: Date.now() });
      }
      return;
    }
  };

  const addVolume = async () => {
    if (!currentProjectId) return;
    const count = await db.volumes.where('projectId').equals(currentProjectId).count();
    const now = Date.now();
    await db.volumes.put({
      id: `vol-${crypto.randomUUID()}`,
      projectId: currentProjectId,
      title: '새 권',
      order: count + 1,
      updatedAt: now,
    });
  };

  const updateProjectTitle = async (id: string, newTitle: string) => {
    await db.projects.update(id, { title: newTitle, updatedAt: Date.now() });
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
        /* 모든 BinderItem의 텍스트 색상을 항상 기본적으로 밝게 보장하고, opacity 1을 강제함 */
        .group,
        .group span.truncate,
        .group .flex {
          opacity: 1 !important;
          color: var(--text-primary) !important;
        }
        
        /* Drag 중인 요소는 dnd-kit가 transform 등을 부여함. 
           정확히 드래그 중인(opacity가 인라인으로 세팅된) 요소의 하위들만 투명도 적용되도록 보장 */
        div[style*="opacity: 0.5"] > .group,
        div[style*="opacity: 0.5"] .group span.truncate {
          opacity: 0.5 !important;
        }
        
        /* 드래그 오버 시 파란 라인 표시용 (isOver 스타일 보강) */
        /* 모든 binder item에 대해 isOver 시 ring 대신 border를 확실히 보여줍니다. */
        .ring-2.ring-\\[var\\(--accent\\)\\] {
          border: 2px solid var(--accent) !important;
          box-shadow: 0 0 0 1px var(--bg-base) !important;
          border-radius: 6px !important;
          outline: none !important;
          ring: none !important;
        }
        
        /* 씬(level 2) 항목도 isOver 시 강조되도록 강제 주입 */
        [data-type="scene"].ring-2 {
           border: 2px solid var(--accent) !important;
        }
      `}</style>
      
      {/* 검색창 */}
      <div className="px-3 py-2 border-b border-[var(--divider)]">
        <div className="relative group/search">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)] group-focus-within/search:text-[var(--accent)] transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && clearSearch()}
            placeholder="모든 문서에서 검색..."
            className="w-full bg-[var(--bg-hover)] border border-transparent focus:border-[var(--accent)] rounded-lg pl-9 pr-8 py-1.5 text-[13px] text-[var(--text-primary)] focus:outline-none transition-all"
          />
          {searchTerm && (
            <button 
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-disabled)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 프로젝트 헤더 */}
      {project && !isSearching && (
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

      {/* 검색 결과 레이어 */}
      {isSearching && (
        <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
          <div className="px-2 py-1.5 mb-2 text-[11px] font-bold text-[var(--text-disabled)] border-b border-[var(--divider)]">
            {searchResults.length}개 문서에서 {searchResults.reduce((sum, r) => sum + r.matchCount, 0)}건 발견
          </div>
          {searchResults.length > 0 ? (
            searchResults.map(result => (
              <button
                key={result.id}
                onClick={() => {
                  setCurrentScene(result.id);
                  setSearchTerm(searchTerm);
                }}
                className="w-full text-left p-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-all flex flex-col gap-1 border border-transparent hover:border-[var(--divider)] group"
              >
                <div className="text-[13px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{result.title}</div>
                {result.snippet && (
                  <div className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed opacity-80 break-all">
                    {result.snippet}
                  </div>
                )}
                <div className="text-[10px] text-[var(--accent)] font-medium mt-1">{result.matchCount}건의 일치</div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-disabled)]">
              <Search size={32} className="mb-2 opacity-20" />
              <div className="text-[13px]">검색 결과가 없습니다</div>
            </div>
          )}
        </div>
      )}

      {/* 스크롤 가능한 트리 영역 */}
      {!isSearching && (
        <div className="flex-1 overflow-y-auto px-2 py-2">
        <DndContext 
          sensors={activeSensors}
          collisionDetection={pointerWithin}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={volumes.map(v => v.id)} strategy={verticalListSortingStrategy}>
            {volumes.map((volume) => {
              const volumeChapters = chapters?.filter(ch => ch.volumeId === volume.id) || [];
              const isVolumeExpanded = expandedIds.has(volume.id);
              
              return (
                <BinderItem
                  key={volume.id}
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
                          <BinderItem
                            key={chapter.id}
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
                                    data-type="scene" /* CSS 선택자용 */
                                  />
                                ))}
                              </SortableContext>
                            </div>
                          </BinderItem>
                        );
                      })}
                    </SortableContext>
                  </div>
                </BinderItem>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
      )}

      {/* 바인더 하단 액션 */}
      <div className="p-3 border-t border-[var(--divider)]">
        <button 
          onClick={addVolume}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--accent)] text-[12px] font-medium text-[var(--text-primary)] opacity-70 hover:opacity-100 hover:text-[var(--accent)] transition-all w-full justify-center"
        >
          <FolderPlus size={14} />
          <span>새 권 추가</span>
        </button>
      </div>
    </div>
  );
}
