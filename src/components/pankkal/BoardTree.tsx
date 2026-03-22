'use client';

import React, { useState } from 'react';
import { PankkalBoard } from '@/hooks/usePankkal';
import { ChevronRight, ChevronDown, Folder, Upload, Check } from 'lucide-react';
import { useAiStore } from '@/store/aiStore';
import { cn } from '@/lib/utils';

interface BoardTreeProps {
  boards: PankkalBoard[];
  onBoardSelect: (boardId: string) => void;
  onAddAll: (boardId: string, boardTitle: string) => void;
  selectedBoardId: string | null;
}

export function BoardTree({ boards, onBoardSelect, onAddAll, selectedBoardId }: BoardTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const worldContext = useAiStore((state) => state.worldContext);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const renderTree = (parentId: string | null = null, level = 0) => {
    const children = boards.filter(b => b.parent_id === parentId);
    if (children.length === 0) return null;

    return (
      <div className={level > 0 ? 'ml-3 border-l border-[var(--border)]' : ''}>
        {children.map(board => {
          const isExpanded = expandedIds.has(board.id);
          const isSelected = selectedBoardId === board.id;
          const hasChildren = boards.some(b => b.parent_id === board.id);
          const isAddedBulk = worldContext.some(c => c.id === `board-${board.id}`);

          return (
            <div key={board.id}>
              <div
                onClick={() => onBoardSelect(board.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-[12px] transition-all rounded-md mx-1 my-0.5 group/board
                  ${isSelected 
                    ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold border border-[var(--border)]/50' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}
                `}
              >
                <div 
                  onClick={(e) => hasChildren && toggleExpand(board.id, e)}
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-[var(--accent)]/10"
                >
                  {hasChildren ? (
                    isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
                  ) : <div className="w-3" />}
                </div>
                <Folder size={13} className={isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-disabled)]'} />
                <span className="truncate flex-1">{board.title}</span>

                {/* 전체 추가 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAddedBulk) onAddAll(board.id, board.title);
                  }}
                  className={cn(
                    "opacity-0 group-hover/board:opacity-100 p-1 rounded transition-all flex items-center gap-1",
                    isAddedBulk 
                      ? "opacity-100 text-[var(--success)] cursor-default" 
                      : "text-[var(--text-disabled)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10"
                  )}
                  title={isAddedBulk ? "추가됨" : "전체 추가"}
                >
                  {isAddedBulk ? <Check size={12} /> : <Upload size={12} />}
                  <span className="text-[9px] font-bold">전체</span>
                </button>
              </div>
              {isExpanded && renderTree(board.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return <div className="py-1">{renderTree(null)}</div>;
}
