'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useResize } from '@/hooks/useResize';

interface ResizeHandleProps {
  direction: 'left' | 'right';
  minWidth: number;
  maxWidth: number;
  width: number;
  onResize: (width: number) => void;
  className?: string;
}

export function ResizeHandle({
  direction,
  minWidth,
  maxWidth,
  width,
  onResize,
  className
}: ResizeHandleProps) {
  const { handleMouseDown } = useResize({
    minWidth,
    maxWidth,
    direction,
    width,
    onResize
  });

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute top-0 bottom-0 w-[6px] cursor-col-resize z-30 group flex justify-center",
        direction === 'left' ? "left-0 -ml-[3px]" : "right-0 -mr-[3px]",
        className
      )}
    >
      <div className="w-[1px] h-full bg-transparent group-hover:bg-[var(--accent)] group-hover:opacity-50 transition-colors" />
    </div>
  );
}
