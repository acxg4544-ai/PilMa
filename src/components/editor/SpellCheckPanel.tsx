'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDrag } from '@/hooks/useDrag';

interface SpellCheckResult {
  original: string;
  suggestions: string[];
  reason: string;
}

interface SpellCheckPanelProps {
  results: SpellCheckResult[];
  isLoading: boolean;
  onClose: () => void;
  onReplace: (original: string, suggestion: string, index: number) => void;
  onRevert: (index: number) => void;
  onHover: (index: number | null) => void;
  onAddToDictionary: (word: string, index: number) => void;
  replacedIndices: Set<number>;
  addedToDictIndices?: Set<number>;
  fixedValues?: Record<number, string>; // 수정된 값 추적
}

export function SpellCheckPanel({ 
  results, 
  isLoading, 
  onClose, 
  onReplace, 
  onRevert,
  onHover,
  onAddToDictionary,
  replacedIndices,
  addedToDictIndices = new Set(),
  fixedValues = {}
}: SpellCheckPanelProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [customText, setCustomText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Position and size state
  const [pos, setPos] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth - 420 : 0, 
    y: typeof window !== 'undefined' ? window.innerHeight - 370 : 0, 
    w: 400, 
    h: 350 
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pilma_spellcheck_pos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 하단 짤림 방지 보정
        const x = Math.min(parsed.x, window.innerWidth - 50);
        const y = Math.min(parsed.y, window.innerHeight - 50);
        setPos({ ...parsed, x, y });
      } catch (e) {
        console.error('Failed to load spellcheck pos', e);
      }
    }
  }, []);

  const handlePositionChange = (newPos: typeof pos) => {
    setPos(newPos);
    localStorage.setItem('pilma_spellcheck_pos', JSON.stringify(newPos));
  };

  const { handleDragStart, handleResizeStart } = useDrag({
    position: pos,
    onPositionChange: handlePositionChange,
    minWidth: 300,
    minHeight: 150
  });

  const Book = ({ size, className }: { size: number, className?: string }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );

  return (
    <div 
      className={cn(
        "fixed z-[9999] flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden backdrop-blur-md transition-all duration-300 ease-out",
        isMinimized ? "!h-[36px]" : ""
      )}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${pos.w}px`,
        height: isMinimized ? '36px' : `${pos.h}px`,
      }}
    >
      {/* Title Bar */}
      <div 
        onMouseDown={handleDragStart}
        className="h-9 px-3 flex items-center justify-between bg-[var(--bg-sidebar)] border-b border-[var(--border)] cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center gap-2 font-bold text-[13px] text-[var(--text-primary)]">
          <span>✏️ 맞춤법 검사</span>
          {results.length > 0 && !isMinimized && (
            <span className="bg-red-500/10 text-red-500 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
              {results.length}개의 오류
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button 
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500 hover:text-white text-[var(--text-secondary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={cn("flex-1 overflow-hidden flex flex-col", isMinimized && "hidden")}>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
              <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
              <p className="text-[12px] font-medium">AI가 본문을 분석하고 있습니다...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)] p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--pm-success)]/10 flex items-center justify-center mb-2">
                <Check size={28} className="text-[var(--pm-success)]" />
              </div>
              <p className="text-[14px] font-bold text-[var(--text-primary)]">맞춤법이 완벽합니다!</p>
              <p className="text-[12px]">발견된 오류가 하나도 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {results.map((item, idx) => (
                <div 
                  key={`${item.original}-${idx}`} 
                  onMouseEnter={() => onHover(idx)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onHover(idx)}
                  className={cn(
                    "p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-editor)] transition-all cursor-pointer hover:border-[var(--accent)]/50 group shadow-sm",
                    (replacedIndices.has(idx) || addedToDictIndices.has(idx)) && "bg-[var(--bg-hover)]/30 border-dashed opacity-70"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 min-h-[24px]">
                        {addedToDictIndices.has(idx) ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] text-[var(--text-disabled)] font-medium">
                              {item.original}
                            </span>
                            <span className="text-[11px] text-[var(--pm-success)] font-bold flex items-center gap-1">
                              <Check size={12} /> 단어장 등록됨
                            </span>
                          </div>
                        ) : replacedIndices.has(idx) ? (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onRevert(idx);
                              }}
                              className="text-[13px] line-through text-red-500/70 hover:text-red-500 transition-colors"
                              title="복구하기"
                            >
                              {item.original}
                            </button>
                            <span className="text-[var(--text-disabled)]">→</span>
                            <span className="text-[14px] text-[var(--pm-success)] font-bold">
                              {fixedValues[idx] || item.suggestions[0]}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-extrabold text-red-500 bg-red-500/5 px-1.5 py-0.5 rounded">
                              {item.original}
                            </span>
                            <span className="text-[var(--text-disabled)]">→</span>
                            <div className="flex flex-wrap gap-1">
                              {item.suggestions.map((suggestion) => (
                                <button
                                  key={suggestion}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReplace(item.original, suggestion, idx);
                                  }}
                                  className="px-2 py-1 text-[12px] bg-[var(--accent)] text-white hover:brightness-110 rounded transition-all font-bold shadow-sm"
                                >
                                  {suggestion}
                                </button>
                              ))}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingIndex(idx);
                                  setCustomText(item.original);
                                }}
                                className="px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded border border-[var(--border)] transition-colors"
                              >
                                직접입력
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {editingIndex === idx && (
                        <div className="mb-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-100">
                          <input
                            autoFocus
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onReplace(item.original, customText, idx);
                              if (e.key === 'Escape') setEditingIndex(null);
                            }}
                            className="flex-1 px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--accent)] rounded text-[13px] outline-none"
                          />
                          <button
                            onClick={() => onReplace(item.original, customText, idx)}
                            className="px-2 py-1.5 bg-[var(--accent)] text-white text-[11px] rounded hover:brightness-110 font-bold"
                          >
                            교체
                          </button>
                        </div>
                      )}
                      
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                        {item.reason}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 items-center shrink-0">
                      {!replacedIndices.has(idx) && !addedToDictIndices.has(idx) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToDictionary(item.original, idx);
                          }}
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-md transition-all sm:opacity-0 group-hover:opacity-100"
                          title="단어장에 추가"
                        >
                          <Book size={16} />
                        </button>
                      )}
                      {addedToDictIndices.has(idx) && <Check size={16} className="text-[var(--pm-success)]" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Resize Handle */}
        <div 
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center group"
        >
          <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-[var(--border)] group-hover:border-[var(--accent)] transition-colors rounded-br-sm" />
        </div>
      </div>
    </div>
  );
}
