'use client';

import React from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [customText, setCustomText] = React.useState('');
  
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
    <div className="z-40 bg-[var(--bg-card)] border-t border-[var(--border)] shadow-2xl flex flex-col h-[250px] animate-in slide-in-from-bottom duration-200 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] shrink-0 bg-[var(--bg-sidebar)]/50">
        <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2">
          ✏️ 맞춤법 검사 결과
          {results.length > 0 && (
            <span className="bg-red-500/10 text-red-500 text-[10px] px-1.5 py-0.5 rounded-full">
              {results.length}개의 오류
            </span>
          )}
        </h3>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-[var(--bg-hover)] rounded-md transition-colors text-[var(--text-secondary)]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)]">
            <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
            <p className="text-[12px]">AI가 맞춤법을 검사하고 있습니다...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-[13px]">
            ✅ 맞춤법 오류가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-1">
            {results.map((item, idx) => (
              <div 
                key={`${item.original}-${idx}`} 
                onMouseEnter={() => onHover(idx)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onHover(idx)}
                className={cn(
                  "p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-editor)] transition-all cursor-pointer hover:border-[var(--accent)]/50",
                  (replacedIndices.has(idx) || addedToDictIndices.has(idx)) && "bg-[var(--bg-hover)]/30 border-dashed opacity-70"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {addedToDictIndices.has(idx) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] text-[var(--text-disabled)] font-medium">
                            {item.original}
                          </span>
                          <span className="text-[12px] text-[var(--pm-success)] bg-[var(--pm-success)]/10 px-2 py-0.5 rounded flex items-center gap-1">
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
                            className="text-[14px] line-through text-red-500 decoration-red-500/50 hover:text-red-600 transition-colors"
                            title="다시 틀린 텍스트로 되돌리기"
                          >
                            {item.original}
                          </button>
                          <span className="text-[var(--text-disabled)]">→</span>
                          <span className="text-[14px] text-[var(--pm-success)] font-medium flex items-center gap-1">
                            <Check size={14} /> {fixedValues[idx] || item.suggestions[0]}
                          </span>
                          <span className="text-[11px] text-[var(--text-disabled)] ml-2 italic">(수정됨)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-red-500">
                            {item.original}
                          </span>
                          <span className="text-[var(--text-disabled)]">→</span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.suggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReplace(item.original, suggestion, idx);
                                }}
                                className="px-2 py-1 text-[12px] bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white rounded transition-colors font-medium border border-[var(--accent)]/20"
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
                              className="px-2 py-1 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded border border-[var(--border)] transition-colors"
                            >
                              직접 입력
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {editingIndex === idx && (
                      <div className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-100">
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
                          className="px-3 py-1.5 bg-[var(--accent)] text-white text-[12px] rounded hover:opacity-90 font-bold"
                        >
                          교체
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="px-2 py-1.5 text-[var(--text-secondary)] text-[12px] hover:bg-[var(--bg-hover)] rounded"
                        >
                          취소
                        </button>
                      </div>
                    )}
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                      {item.reason}
                    </p>
                  </div>
                  
                  {/* 단어장 추가 버튼 */}
                  {!replacedIndices.has(idx) && !addedToDictIndices.has(idx) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToDictionary(item.original, idx);
                      }}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 rounded-md transition-all shrink-0"
                      title="단어장에 추가"
                    >
                      <Book size={18} />
                    </button>
                  )}
                  {addedToDictIndices.has(idx) && (
                    <div className="p-1.5 text-[var(--pm-success)] shrink-0">
                      <Check size={18} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
