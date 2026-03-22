'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Pin, Check } from 'lucide-react';

interface AiSuggestionProps {
  index: number;
  content: string;
  isLoading: boolean;
  onClick: () => void;
  onPin?: () => void;
  isPinned?: boolean;
}

export function AiSuggestion({ index, content, isLoading, onClick, onPin, isPinned }: AiSuggestionProps) {
  const [justPinned, setJustPinned] = React.useState(false);
  const isStreaming = isLoading && content.length === 0;

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPin) {
      onPin();
      setJustPinned(true);
      setTimeout(() => setJustPinned(false), 2000);
    }
  };

  return (
    <div
      onDoubleClick={onClick}
      className={cn(
        "group relative p-3.5 rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] transition-all duration-150",
        "hover:border-[var(--accent)] hover:-translate-y-[1px] hover:shadow-md",
        "active:translate-y-0 active:shadow-sm"
      )}
    >
      {/* 번호 배지 */}
      <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
        <span className="text-[11px] font-bold text-white leading-none">{index + 1}</span>
      </div>
      
      {/* 핀 버튼 */}
      {onPin && !isStreaming && (
        <button
          onClick={handlePin}
          className={cn(
            "absolute top-3 right-3 p-1.5 rounded-md transition-all duration-200",
            (isPinned || justPinned) 
              ? "text-[var(--pm-success)] bg-[var(--pm-success)]/10" 
              : "text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] opacity-0 group-hover:opacity-100"
          )}
          title="모아두기에 저장"
        >
          {isPinned || justPinned ? <Check size={14} /> : <Pin size={14} />}
        </button>
      )}
      
      <div className="pl-7 pr-6">
        <p className="text-[13px] leading-relaxed text-[var(--text-primary)] min-h-[1.5rem]" style={{ fontFamily: 'var(--font-noto-serif-kr)' }}>
          {content}
          {isLoading && content.length > 0 && (
            <span className="inline-block w-[2px] h-4 bg-[var(--accent)] ml-0.5 animate-pulse align-middle" />
          )}
          {isStreaming && (
            <span className="text-[var(--text-disabled)] italic text-[12px]">생각 중...</span>
          )}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-[var(--text-disabled)] italic">더블클릭하여 삽입</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded text-[10px] font-bold hover:bg-[var(--accent)] hover:text-white transition-all"
        >
          본문에 삽입
        </button>
      </div>
    </div>
  );
}
