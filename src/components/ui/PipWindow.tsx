'use client';

import React, { ReactNode } from 'react';
import { useDrag } from '@/hooks/useDrag';
import { Pin, X } from 'lucide-react';

interface PipWindowProps {
  title: ReactNode;
  position: { x: number; y: number; w: number; h: number };
  onPositionChange: (pos: { x: number; y: number; w: number; h: number }) => void;
  onRestore: () => void;
  onClose: () => void;
  children: ReactNode;
  controls?: ReactNode; // 추가
  minWidth?: number;
  minHeight?: number;
}

export function PipWindow({
  title,
  position,
  onPositionChange,
  onRestore,
  onClose,
  children,
  controls,
  minWidth = 300,
  minHeight = 200
}: PipWindowProps) {
  const { handleDragStart, handleResizeStart } = useDrag({
    position,
    onPositionChange,
    minWidth,
    minHeight,
  });

  return (
    <div
      className="fixed z-50 flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden backdrop-blur-md"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${position.w}px`,
        height: 'auto',
        minHeight: `${minHeight}px`,
        maxHeight: '85vh',
      }}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleDragStart}
        className="h-9 px-3 flex items-center justify-between bg-[var(--bg-sidebar)]/90 border-b border-[var(--border)] cursor-grab active:cursor-grabbing shrink-0"
      >
        <div className="flex-1 font-medium text-[13px] text-[var(--text-primary)] select-none truncate flex items-center gap-2">
          {title}
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <button
            onClick={onRestore}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="원래 위치로 복구"
          >
            <Pin size={14} className="rotate-45" />
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--danger)] hover:text-white text-[var(--text-secondary)] transition-colors"
            title="오리지널 위치로 복구하며 닫기"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      {controls && (
        <div className="bg-[var(--bg-card)] border-b border-[var(--border)] shrink-0 z-20">
          {controls}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative rounded-b-xl bg-[var(--bg-card)]">
        {children}
      </div>

      {/* Resize Handle (Bottom Right) */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
      >
        <svg viewBox="0 0 10 10" className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity w-full h-full text-[var(--text-secondary)]">
          <polygon points="10,0 10,10 0,10" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
