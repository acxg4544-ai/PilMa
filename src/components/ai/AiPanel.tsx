'use client';

import React, { useEffect, useState } from 'react';
import { useAiStore } from '@/store/aiStore';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore'; // 프로젝트 스토어 추가
import { cn } from '@/lib/utils';
import { X, Sparkles, Key, AlertCircle, RefreshCcw, Library, SquareArrowOutUpRight, Pin, Trash2, Plus, ChevronDown } from 'lucide-react';
import { AiSuggestion } from './AiSuggestion';
import { PipWindow } from '@/components/ui/PipWindow';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

interface AiPanelProps {
  onInsert: (content: string) => void;
  onRefresh: () => void;
}

export function AiPanel({ onInsert, onRefresh }: AiPanelProps) {
  const { 
    isAiPanelOpen, 
    setAiPanelOpen, 
    suggestions, 
    isAiLoading, 
    aiError,
    worldContext,
    removeWorldContext,
    lastUsedPrompt 
  } = useAiStore();

  const {
    aiPanelWidth, setAiPanelWidth,
    aiPanelPipMode, setAiPanelPipMode,
    aiPanelPipPosition, setAiPanelPipPosition,
    currentSceneId // 추가
  } = useUiStore();

  const { currentProjectId } = useProjectStore(); // 추가

  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);

  // 핀한 문장 로드 (최신순)
  const pinnedSentences = useLiveQuery(
    () => (currentProjectId ? db.pinned_sentences.where('projectId').equals(currentProjectId).reverse().sortBy('createdAt') : []),
    [currentProjectId]
  ) || [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAiPanelOpen) return;
      
      if (e.key === 'Escape') {
        setAiPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAiPanelOpen, setAiPanelOpen, suggestions, onInsert]);

  const handlePin = async (text: string) => {
    if (!currentProjectId || !text) return;
    try {
      await db.pinned_sentences.add({
        projectId: currentProjectId,
        sceneId: currentSceneId || 'default',
        text,
        createdAt: Date.now()
      });
    } catch (e) {
      console.error('Failed to pin sentence', e);
    }
  };

  const handleDeletePinned = async (id?: number) => {
    if (!id) return;
    try {
      await db.pinned_sentences.delete(id);
    } catch (e) {
      console.error('Failed to delete pinned sentence', e);
    }
  };

  const innerContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 세계관 컨텍스트 태그 */}
      {worldContext.length > 0 && (
        <div className="px-4 py-2.5 flex flex-wrap gap-1.5 border-b border-[var(--divider)] items-center shrink-0">
          <div className="flex items-center gap-1 text-[10px] text-[var(--accent)] font-bold mr-1 uppercase tracking-wider">
            <Library size={11} />
            <span>Context</span>
          </div>
          {worldContext.map((card) => (
            <div 
              key={card.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent)] text-white text-[11px] font-medium group"
            >
              <span className="max-w-[80px] truncate leading-none">{card.title}</span>
              <button 
                onClick={() => removeWorldContext(card.id)}
                className="text-[var(--pm-text-muted)] hover:text-[var(--pm-danger)] transition-colors"
                title="제거"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 본문 영역 - 스크롤 가능 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="p-4 space-y-4">
          {aiError === 'API_KEY_NOT_FOUND' ? (
            <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-[var(--border)] text-center space-y-3">
              <Key size={28} className="text-[var(--text-disabled)]" />
              <div className="space-y-1">
                <h3 className="font-semibold text-[13px] text-[var(--text-primary)]">API 키 필요</h3>
                <p className="text-[12px] text-[var(--text-secondary)]">.env.local 파일에 Gemini API 키를 설정해주세요.</p>
              </div>
            </div>
          ) : aiError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <AlertCircle size={28} className="text-[var(--danger)] opacity-50" />
              <div className="space-y-1">
                <p className="text-[13px] text-[var(--text-secondary)]">문장을 가져오지 못했습니다.</p>
                <button 
                  onClick={onRefresh}
                  className="text-[12px] text-[var(--accent)] hover:underline font-medium flex items-center gap-1 mx-auto"
                >
                  <RefreshCcw size={12} />
                  다시 시도
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {suggestions.map((content, i) => (
                <AiSuggestion
                  key={i}
                  index={i}
                  content={content}
                  isLoading={isAiLoading}
                  onClick={() => {
                    onInsert(content);
                    setAiPanelOpen(false);
                  }}
                  onPin={() => handlePin(content)}
                  isPinned={pinnedSentences.some(s => s.text === content)}
                />
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-[var(--divider)] space-y-2">
            {lastUsedPrompt && (
              <div className="bg-[var(--bg-hover)] rounded-md px-3 py-2 text-center text-[10px] text-[var(--accent)] font-medium border border-[var(--border)] italic">
                &quot;{lastUsedPrompt}&quot;
              </div>
            )}
            <p className="text-[10px] text-[var(--text-disabled)] text-center leading-relaxed">
              블록 선택 후 Ctrl+1~5 또는 Ctrl+Space로 <br /> 새로운 문장을 요청할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 핀한 문장 모아두기 */}
        <div className="border-t border-[var(--divider)] bg-[var(--bg-sidebar)]/50">
          <button 
            onClick={() => setIsPinnedExpanded(!isPinnedExpanded)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Pin size={14} className={cn("text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors", pinnedSentences.length > 0 && "text-[var(--accent)]")} />
              <span className="text-[12px] font-bold text-[var(--text-primary)]">모아둔 문장</span>
              {pinnedSentences.length > 0 && (
                <span className="bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {pinnedSentences.length}
                </span>
              )}
            </div>
            <ChevronDown size={14} className={cn("text-[var(--text-disabled)] transition-transform duration-200", isPinnedExpanded && "rotate-180")} />
          </button>

          {isPinnedExpanded && (
            <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-1 duration-200">
              {pinnedSentences.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[11px] text-[var(--text-disabled)]">핀한 문장이 없습니다.</p>
                </div>
              ) : (
                pinnedSentences.map((s) => (
                  <div 
                    key={s.id}
                    className="group/item flex flex-col p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all shadow-sm"
                  >
                    <p className="text-[13px] leading-relaxed text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-noto-serif-kr)' }}>
                      {s.text}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDeletePinned(s.id)}
                        className="p-1 px-2 flex items-center gap-1 text-[10px] text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="제거"
                      >
                        <Trash2 size={12} />
                        <span>삭제</span>
                      </button>
                      <button 
                        onClick={() => {
                          onInsert(s.text);
                          setAiPanelOpen(false);
                        }}
                        className="p-1 px-2 flex items-center gap-1 text-[10px] text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded transition-all font-bold"
                        title="본문에 삽입"
                      >
                        <Plus size={12} />
                        <span>삽입</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (aiPanelPipMode) {
    if (!isAiPanelOpen) return null;
    return (
      <PipWindow
        title={
          <>
            <Sparkles size={14} className="text-[var(--accent)]" />
            <span>AI 추천</span>
          </>
        }
        position={aiPanelPipPosition}
        onPositionChange={setAiPanelPipPosition}
        onRestore={() => setAiPanelPipMode(false)}
        onClose={() => setAiPanelOpen(false)}
        minWidth={280}
        minHeight={300}
      >
        <div className="flex flex-col h-full bg-[var(--bg-sidebar)]">
          {innerContent}
        </div>
      </PipWindow>
    );
  }

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-20 flex flex-col bg-[var(--bg-sidebar)] border-l border-[var(--divider)] transition-transform duration-300 ease-in-out',
          !isAiPanelOpen && 'translate-x-full'
        )}
        style={{ width: `${aiPanelWidth}px` }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between h-12 px-4 border-b border-[var(--divider)] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--accent)]" />
            <span className="font-semibold text-[14px] text-[var(--text-primary)]">AI 추천 ✨</span>
          </div>
          <div className="flex flex-row items-center gap-1.5">
            <button
              onClick={() => setAiPanelPipMode(true)}
              className="hidden md:flex w-7 h-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all"
              title="플로팅(PIP) 모드로 분리"
            >
              <SquareArrowOutUpRight size={14} />
            </button>
            <button
              onClick={() => setAiPanelOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
              title="패널 닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {innerContent}
      </aside>

      {/* 좌측 리사이즈 핸들 (AI 패널 열려있고 PIP 아닐 때만) */}
      {isAiPanelOpen && (
        <div className="hidden md:block fixed inset-y-0 z-30 pointer-events-none" style={{ right: `${aiPanelWidth}px` }}>
          <div className="relative h-full pointer-events-auto">
            <ResizeHandle
              direction="left"
              minWidth={280}
              maxWidth={500}
              width={aiPanelWidth}
              onResize={setAiPanelWidth}
            />
          </div>
        </div>
      )}
    </>
  );
}
