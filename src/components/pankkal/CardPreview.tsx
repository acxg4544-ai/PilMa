'use client';

import React, { useState } from 'react';
import { PankkalCard, PankkalBoardData, PankkalRelationship } from '@/hooks/usePankkal';
import { useAiStore } from '@/store/aiStore';
import { cn } from '@/lib/utils';
import { PlusCircle, StickyNote, CheckSquare, Layout, X, Link, MoreHorizontal } from 'lucide-react';

interface CardPreviewProps {
  boardData: PankkalBoardData;
}

export function CardPreview({ boardData }: CardPreviewProps) {
  const { groups, relationships } = boardData;
  const addWorldContext = useAiStore((state) => state.addWorldContext);
  const worldContext = useAiStore((state) => state.worldContext);
  const [selectedCard, setSelectedCard] = useState<PankkalCard | null>(null);

  const getIcon = (type: PankkalCard['type']) => {
    switch (type) {
      case 'note': return <StickyNote size={13} className="text-[var(--accent)]" />;
      case 'todo': return <CheckSquare size={13} className="text-[var(--accent)]" />;
      case 'column': return <Layout size={13} className="text-[var(--accent)]" />;
      default: return <StickyNote size={13} />;
    }
  };

  const CardItem = ({ card }: { card: PankkalCard }) => {
    const isAdded = worldContext.some(c => c.id === card.id);
    return (
      <div 
        onClick={() => setSelectedCard(card)}
        className="group bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-2.5 hover:border-[var(--accent)]/40 transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {getIcon(card.type)}
            <h4 className="font-semibold text-[11px] text-[var(--text-secondary)] truncate">{card.title}</h4>
          </div>
          <button
            disabled={isAdded}
            onClick={(e) => {
              e.stopPropagation();
              addWorldContext({ id: card.id, title: card.title, content: card.content });
            }}
            className={cn(
              "px-2 py-0.5 rounded-xl text-[11px] font-medium transition-all border flex-shrink-0",
              isAdded 
                ? "text-[var(--text-disabled)] border-transparent cursor-default" 
                : "text-[var(--accent)] border-[var(--accent)] hover:bg-[var(--accent)]/10"
            )}
          >
            {isAdded ? '추가됨' : 'AI 추가'}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-[var(--text-disabled)] leading-relaxed line-clamp-2">
          {card.content}
        </p>
      </div>
    );
  };

  if (groups.length === 0 && relationships.length === 0) {
    return <div className="p-4 text-center text-[11px] text-[var(--text-disabled)]">이 보드에는 데이터가 없습니다.</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-sidebar)] relative">
      <div className="flex-1 p-2.5 space-y-6 overflow-y-auto pb-20">
        {/* 그룹별 카드 렌더링 */}
        {groups.map(group => (
          <div key={group.columnId} className="space-y-2.5">
            <div className="flex items-center gap-1.5 px-1 py-1 border-b border-[var(--border)]/50">
              {group.columnId === 'others' ? <MoreHorizontal size={13} className="text-[var(--text-disabled)]" /> : <Layout size={13} className="text-[var(--accent)]" />}
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest">{group.columnTitle}</span>
              <span className="text-[9px] text-[var(--text-disabled)] font-bold ml-auto">{group.cards.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 pl-1.5">
              {group.cards.map(card => (
                <CardItem key={card.id} card={card} />
              ))}
            </div>
          </div>
        ))}

        {/* 관계 섹션 */}
        {relationships.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-1.5 px-1 py-1 mb-3 border-b border-[var(--border)]/50">
              <Link size={13} className="text-[var(--text-disabled)]" />
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest">📎 관계 (Relationships)</span>
              <span className="text-[9px] text-[var(--text-disabled)] font-bold ml-auto">{relationships.length}</span>
            </div>
            <div className="space-y-2 pl-2">
              {relationships.map((rel, idx) => (
                <div key={`${rel.fromId}-${rel.toId}-${idx}`} className="flex items-center gap-2 text-[10px] bg-[var(--bg-card)]/30 p-2 rounded-lg border border-[var(--border)] animate-in fade-in slide-in-from-left-1 duration-300">
                  <div className="flex flex-col items-end flex-1 min-w-0">
                    <span className="text-[var(--text-secondary)] font-bold truncate w-full text-right">{rel.fromTitle}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 px-1">
                    <span className="text-[9px] text-[var(--accent)] font-bold bg-[var(--accent)]/10 px-1.5 py-0.5 rounded whitespace-nowrap">{rel.label}</span>
                    <div className="h-0.5 w-6 bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-[var(--text-secondary)] font-bold truncate w-full">{rel.toTitle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 카드 상세 팝업 */}
      {selectedCard && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedCard(null)}
        >
          <div 
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getIcon(selectedCard.type)}
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">{selectedCard.title}</span>
              </div>
              <button 
                onClick={() => setSelectedCard(null)} 
                className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-disabled)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 max-h-[50vh] overflow-y-auto">
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--font-noto-serif-kr)' }}>
                {selectedCard.content}
              </p>
            </div>
            <div className="p-3.5 border-t border-[var(--border)] flex justify-end">
              <button
                onClick={() => {
                  addWorldContext({ id: selectedCard.id, title: selectedCard.title, content: selectedCard.content });
                  setSelectedCard(null);
                }}
                disabled={worldContext.some(c => c.id === selectedCard.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] disabled:opacity-30 text-[12px] font-semibold text-white transition-all hover:opacity-90 shadow-lg shadow-[var(--accent)]/20"
              >
                <PlusCircle size={14} />
                <span>AI 정보로 추가</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
