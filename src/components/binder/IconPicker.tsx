import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';

interface IconPickerProps {
  id: string; // db item id
  type: 'volume' | 'chapter' | 'scene';
  currentIcon?: string;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const ICONS = [
  '📁', '📂', '📝', '✏️', '⭐', '📌', '🔒', '🗑️', '💡', '🎭', '🗺️', '📋'
];

export function IconPicker({ id, type, currentIcon, onClose, triggerRef }: IconPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, triggerRef]);

  const handleSelect = async (icon: string) => {
    if (type === 'volume') await db.volumes.update(id, { icon });
    else if (type === 'chapter') await db.chapters.update(id, { icon });
    else if (type === 'scene') await db.scenes.update(id, { icon });
    onClose();
  };

  const handleReset = async () => {
    if (type === 'volume') await db.volumes.update(id, { icon: undefined });
    else if (type === 'chapter') await db.chapters.update(id, { icon: undefined });
    else if (type === 'scene') await db.scenes.update(id, { icon: undefined });
    onClose();
  };

  // calculate position based on triggerRef
  const style: React.CSSProperties = {};
  if (triggerRef.current && popoverRef.current) {
    const rect = triggerRef.current.getBoundingClientRect();
    // try to place below
    style.top = rect.bottom + 'px';
    style.left = rect.left + 'px';
  }

  return (
    <div
      ref={popoverRef}
      className="absolute z-[10000] w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl p-2 select-none"
      style={{
        top: triggerRef.current ? Math.min(triggerRef.current.getBoundingClientRect().bottom, window.innerHeight - 150) : 0,
        left: triggerRef.current ? Math.max(8, Math.min(triggerRef.current.getBoundingClientRect().left, window.innerWidth - 200)) : 0,
        position: 'fixed'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[11px] text-[var(--text-disabled)] mb-2 px-1 font-semibold tracking-wider">아이콘 변경</div>
      <div className="grid grid-cols-4 gap-1">
        {ICONS.map((icon) => (
          <button
            key={icon}
            onClick={() => handleSelect(icon)}
            className={cn(
              "h-8 flex items-center justify-center text-lg rounded-md hover:bg-[var(--bg-hover)] transition-colors",
              currentIcon === icon && "bg-[var(--bg-hover)] border border-[var(--accent)]"
            )}
          >
            {icon}
          </button>
        ))}
      </div>
      <div className="h-px bg-[var(--divider)] my-2" />
      <button
        onClick={handleReset}
        className="w-full text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] py-1.5 rounded transition-colors"
      >
        기본 아이콘으로 복구
      </button>
    </div>
  );
}
