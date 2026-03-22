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
  replacedIndices: Set<number>;
}

export function SpellCheckPanel({ 
  results, 
  isLoading, 
  onClose, 
  onReplace, 
  replacedIndices 
}: SpellCheckPanelProps) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [customText, setCustomText] = React.useState('');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)] border-t border-[var(--border)] shadow-2xl flex flex-col h-[250px] animate-in slide-in-from-bottom duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] shrink-0">
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
                className={cn(
                  "p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-editor)] transition-all",
                  replacedIndices.has(idx) && "opacity-50"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] line-through text-red-500 decoration-red-500/50">
                        {item.original}
                      </span>
                      <span className="text-[var(--text-disabled)]">→</span>
                      {replacedIndices.has(idx) ? (
                        <span className="text-[14px] text-[var(--pm-success)] font-medium flex items-center gap-1">
                          <Check size={14} /> 수정됨
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {item.suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => onReplace(item.original, suggestion, idx)}
                              className="px-2 py-1 text-[12px] bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white rounded transition-colors font-medium border border-[var(--accent)]/20"
                            >
                              {suggestion}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setEditingIndex(idx);
                              setCustomText(item.original);
                            }}
                            className="px-2 py-1 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded border border-[var(--border)] transition-colors"
                          >
                            직접 입력
                          </button>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
