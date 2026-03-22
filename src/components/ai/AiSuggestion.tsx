'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AiSuggestionProps {
  index: number;
  content: string;
  isLoading: boolean;
  onClick: () => void;
}

export function AiSuggestion({ index, content, isLoading, onClick }: AiSuggestionProps) {
  const isStreaming = isLoading && content.length === 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-3.5 rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] cursor-pointer transition-all duration-150",
        "hover:border-[var(--accent)] hover:-translate-y-[1px] hover:shadow-md",
        "active:translate-y-0 active:shadow-sm"
      )}
    >
      {/* 번호 배지 */}
      <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
        <span className="text-[11px] font-bold text-white leading-none">{index + 1}</span>
      </div>
      
      <div className="pl-7">
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

      <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-[var(--text-disabled)]">클릭 또는 {index + 1}키</span>
      </div>
    </div>
  );
}
