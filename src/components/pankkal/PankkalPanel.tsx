'use client';

import React, { useEffect, useState } from 'react';
import { usePankkal, PankkalCard, PankkalBoardData } from '@/hooks/usePankkal';
import { useAiStore } from '@/store/aiStore';
import { useAuthStore } from '@/store/authStore';
import { BoardTree } from './BoardTree';
import { CardPreview } from './CardPreview';
import { Globe, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export function PankkalPanel() {
  const { boards, isLoading, fetchBoards, fetchCardsFromBoard } = usePankkal();
  const { user } = useAuthStore();
  const addWorldContext = useAiStore((state) => state.addWorldContext);
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [boardData, setBoardData] = useState<PankkalBoardData | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    if (user) fetchBoards();
  }, [fetchBoards, user]);

  const handleBoardSelect = async (boardId: string) => {
    setSelectedBoardId(boardId);
    setIsDetailLoading(true);
    const fetchedData = await fetchCardsFromBoard(boardId);
    setBoardData(fetchedData);
    setIsDetailLoading(false);
  };

  const handleAddBoardToAi = async (boardId: string, title: string) => {
    const data = await fetchCardsFromBoard(boardId);
    if (!data) return;

    // 보드 전체 요약 텍스트 생성
    let summary = `[보드: ${title}]\n`;
    
    // 카드 정보 추가
    data.allCards.forEach(card => {
      summary += `- ${card.title}: ${card.content}\n`;
    });

    // 관계 정보 추가
    if (data.relationships.length > 0) {
      summary += `\n[관계]\n`;
      data.relationships.forEach(rel => {
        summary += `- ${rel.fromTitle} → ${rel.toTitle} (${rel.label})\n`;
      });
    }

    addWorldContext({
      id: `board-${boardId}`,
      title,
      content: summary.trim()
    });
  };

  const clearSelection = () => {
    setSelectedBoardId(null);
    setBoardData(null);
  };

  if (!user) {
    return (
      <div className="flex flex-col border-t border-[var(--divider)]">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--divider)]">
          <Globe size={14} className="text-[var(--text-disabled)]" />
          <span className="text-[11px] font-bold text-[var(--text-secondary)] tracking-wider uppercase">세계관</span>
        </div>
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle size={20} className="text-[var(--text-disabled)] mb-2" />
          <p className="text-[10px] text-[var(--text-disabled)] leading-relaxed">
            로그인하면 판깔 세계관을<br />볼 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col border-t border-[var(--border)] transition-all duration-300 ease-in-out ${isExpanded ? 'flex-1 min-h-[200px]' : 'flex-none h-10 overflow-hidden'}`}>
      {/* 세계관 헤더 */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] cursor-pointer group hover:bg-[var(--bg-hover)] transition-all"
      >
        <div className="flex items-center gap-2">
          {selectedBoardId ? (
            <button 
              onClick={(e) => { e.stopPropagation(); clearSelection(); }} 
              className="text-[var(--text-disabled)] hover:text-[var(--text-primary)] p-0.5 rounded hover:bg-[var(--bg-hover)] transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          ) : (
            <Globe size={14} className={isExpanded ? 'text-[var(--accent)]' : 'text-[var(--text-disabled)]'} />
          )}
          <span className={`text-[11px] font-bold tracking-wider transition-colors uppercase ${isExpanded ? 'text-[var(--text-secondary)]' : 'text-[var(--text-disabled)]'}`}>
            {selectedBoardId ? boards.find(b => b.id === selectedBoardId)?.title : '세계관'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isExpanded && (
            <button 
              onClick={(e) => { e.stopPropagation(); selectedBoardId ? handleBoardSelect(selectedBoardId) : fetchBoards(); }}
              disabled={isLoading || isDetailLoading}
              className="text-[var(--text-disabled)] hover:text-[var(--text-secondary)] disabled:opacity-30 transition-all"
              title="새로고침"
            >
              <RefreshCw size={12} className={isLoading || isDetailLoading ? 'animate-spin' : ''} />
            </button>
          )}
          {isExpanded ? <ChevronDown size={13} className="text-[var(--text-disabled)]" /> : <ChevronRight size={13} className="text-[var(--text-disabled)]" />}
        </div>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-6 gap-2">
              <RefreshCw size={18} className="animate-spin text-[var(--accent)]" />
              <span className="text-[10px] text-[var(--text-disabled)]">정보 로딩 중...</span>
            </div>
          ) : boards.length === 0 ? (
            <div className="p-6 text-center flex flex-col items-center gap-2">
              <AlertCircle size={24} className="text-[var(--text-disabled)]" />
              <div className="space-y-1">
                <p className="text-[11px] text-[var(--text-secondary)]">데이터가 없습니다</p>
                <p className="text-[10px] text-[var(--text-disabled)] leading-normal">
                  판깔(PanKKal)에서 세계관 보드와<br />카드를 먼저 만들어주세요.
                </p>
              </div>
            </div>
          ) : selectedBoardId ? (
            isDetailLoading ? (
              <div className="p-6 text-center animate-pulse">
                <span className="text-[10px] text-[var(--text-disabled)]">카드 데이터 추출 중...</span>
              </div>
            ) : boardData ? (
              <CardPreview boardData={boardData} />
            ) : null
          ) : (
            <BoardTree 
              boards={boards} 
              onBoardSelect={handleBoardSelect} 
              onAddAll={handleAddBoardToAi}
              selectedBoardId={selectedBoardId} 
            />
          )}
        </div>
      )}
    </div>
  );
}
