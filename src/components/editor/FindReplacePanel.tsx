'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, ChevronDown, ChevronUp, Replace, ReplaceAll } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDrag } from '@/hooks/useDrag';

interface FindReplacePanelProps {
  onClose: () => void;
  onFind: (text: string) => void;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplace: (replaceWith: string) => void;
  onReplaceAll: (text: string, replaceWith: string) => void;
  findText: string;
  replaceText: string;
  setFindText: (text: string) => void;
  setReplaceText: (text: string) => void;
  currentIndex: number;
  totalMatches: number;
  mode: 'find' | 'replace';
}

export function FindReplacePanel({
  onClose,
  onFind,
  onFindNext,
  onFindPrev,
  onReplace,
  onReplaceAll,
  findText,
  replaceText,
  setFindText,
  setReplaceText,
  currentIndex,
  totalMatches,
  mode
}: FindReplacePanelProps) {
  const [pos, setPos] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth - 380 : 0, 
    y: typeof window !== 'undefined' ? 80 : 0, 
    w: 320, 
    h: mode === 'replace' ? 220 : 160 
  });

  const handlePositionChange = (newPos: typeof pos) => {
    setPos(newPos);
  };

  const { handleDragStart } = useDrag({
    position: pos,
    onPositionChange: handlePositionChange
  });

  useEffect(() => {
    if (findText) {
      onFind(findText);
    }
  }, [findText, onFind]);

  return (
    <div 
      className="fixed z-[9999] flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden backdrop-blur-md"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${pos.w}px`,
        height: mode === 'replace' ? '220px' : '150px',
      }}
    >
      {/* Title Bar */}
      <div 
        onMouseDown={handleDragStart}
        className="h-9 px-3 flex items-center justify-between bg-[var(--bg-sidebar)] border-b border-[var(--border)] cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center gap-2 font-bold text-[13px] text-[var(--text-primary)]">
          <Search size={14} className="text-[var(--accent)]" />
          <span>{mode === 'replace' ? '찾아 바꾸기' : '찾기'}</span>
        </div>
        <button 
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500 hover:text-white text-[var(--text-secondary)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Find Input */}
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <input
              autoFocus
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onFindNext();
                if (e.key === 'Escape') onClose();
              }}
              placeholder="찾을 단어..."
              className="w-full pl-3 pr-20 py-1.5 bg-[var(--bg-hover)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg text-[13px] text-[var(--text-primary)] outline-none transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="text-[10px] text-[var(--text-disabled)] font-bold tabular-nums">
                {totalMatches > 0 ? `${currentIndex + 1}/${totalMatches}` : '0/0'}
              </span>
              <button onClick={onFindPrev} className="p-0.5 hover:bg-[var(--bg-card)] rounded text-[var(--text-secondary)]">
                <ChevronUp size={14} />
              </button>
              <button onClick={onFindNext} className="p-0.5 hover:bg-[var(--bg-card)] rounded text-[var(--text-secondary)]">
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Replace Input */}
        {mode === 'replace' && (
          <div className="flex flex-col gap-1.5">
            <input
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="바꿀 단어..."
              className="w-full px-3 py-1.5 bg-[var(--bg-hover)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg text-[13px] text-[var(--text-primary)] outline-none transition-all"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-1">
          {mode === 'replace' ? (
            <>
              <button
                onClick={() => onReplace(replaceText)}
                disabled={totalMatches === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[var(--accent)] text-white text-[12px] font-bold rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Replace size={14} />
                바꾸기
              </button>
              <button
                onClick={() => onReplaceAll(findText, replaceText)}
                disabled={totalMatches === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-bold rounded-lg hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-all"
              >
                <ReplaceAll size={14} />
                모두 바꾸기
              </button>
            </>
          ) : (
            <button
              onClick={onFindNext}
              disabled={totalMatches === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[var(--accent)] text-white text-[12px] font-bold rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
            >
              다음 찾기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
