import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';

interface IconPickerProps {
  id: string; // db item id
  type: 'volume' | 'chapter' | 'scene';
  currentIcon?: string;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const ICON_CATEGORIES = {
  캐릭터: [
    { icon: '🧑', name: '인물' }, { icon: '👤', name: '주인공' }, { icon: '👥', name: '그룹' }, { icon: '🦹', name: '빌런' },
    { icon: '👸', name: '귀족' }, { icon: '🧙', name: '마법사' }, { icon: '⚔️', name: '전사' }, { icon: '🤖', name: '기계' }
  ],
  장소: [
    { icon: '🏰', name: '성' }, { icon: '🏠', name: '집' }, { icon: '🌆', name: '도시' }, { icon: '🏔️', name: '산' },
    { icon: '🌊', name: '바다' }, { icon: '🌲', name: '숲' }, { icon: '🗺️', name: '지도' }, { icon: '🌍', name: '세계' },
    { icon: '🏛️', name: '신전' }, { icon: '🏚️', name: '폐허' }
  ],
  사물: [
    { icon: '💎', name: '보석' }, { icon: '🗡️', name: '무기' }, { icon: '📜', name: '두루마리' }, { icon: '🔮', name: '마법' },
    { icon: '💊', name: '약' }, { icon: '🔑', name: '열쇠' }, { icon: '👑', name: '왕관' }, { icon: '🛡️', name: '방패' }
  ],
  이벤트: [
    { icon: '⚡', name: '사건' }, { icon: '💀', name: '죽음' }, { icon: '💕', name: '로맨스' }, { icon: '🤝', name: '동맹' },
    { icon: '💢', name: '갈등' }, { icon: '🎭', name: '반전' }, { icon: '🏆', name: '승리' }, { icon: '💔', name: '이별' }
  ],
  기본: [
    { icon: '📁', name: '폴더' }, { icon: '📂', name: '열린폴더' }, { icon: '📝', name: '문서' }, { icon: '✏️', name: '작업중' },
    { icon: '⭐', name: '즐겨찾기' }, { icon: '📌', name: '중요' }, { icon: '🔒', name: '잠금' }, { icon: '🗑️', name: '휴지통' },
    { icon: '💡', name: '아이디어' }, { icon: '📋', name: '메모' }, { icon: '🔖', name: '북마크' }, { icon: '📎', name: '참고' },
    { icon: '✅', name: '완료' }, { icon: '❌', name: '보류' }, { icon: '🕐', name: '예정' }
  ],
  감정: [
    { icon: '😂', name: '코믹' }, { icon: '😢', name: '슬픔' }, { icon: '😱', name: '공포' }, { icon: '🔥', name: '열정' },
    { icon: '❄️', name: '냉정' }, { icon: '🌙', name: '밤' }, { icon: '☀️', name: '낮' }
  ]
};

type Category = keyof typeof ICON_CATEGORIES;

export function IconPicker({ id, type, currentIcon, onClose, triggerRef }: IconPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Category>('기본');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  if (!mounted) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className="z-[9999] w-64 bg-[var(--bg-card)] rounded-[12px] p-0 select-none flex flex-col overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        top: triggerRef.current ? Math.min(triggerRef.current.getBoundingClientRect().bottom + 8, window.innerHeight - 320) : 0,
        left: triggerRef.current ? Math.max(8, Math.min(triggerRef.current.getBoundingClientRect().left - 100, window.innerWidth - 264)) : 0,
        position: 'fixed'
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-base)] border-b border-[var(--border)] overflow-x-auto no-scrollbar">
        {(Object.keys(ICON_CATEGORIES) as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={cn(
              "px-2 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors",
              activeTab === cat ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="p-3">
        <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto no-scrollbar">
          {ICON_CATEGORIES[activeTab].map(({ icon, name }) => (
            <button
              key={icon}
              onClick={() => handleSelect(icon)}
              title={name}
              className={cn(
                "h-8 w-8 flex items-center justify-center text-xl rounded-lg hover:bg-[var(--bg-hover)] transition-all transform hover:scale-110",
                currentIcon === icon && "bg-[var(--bg-hover)] border-2 border-[var(--accent)]"
              )}
            >
              {icon}
            </button>
          ))}
        </div>
        
        <div className="h-px bg-[var(--divider)] my-3" />
        
        <button
          onClick={handleReset}
          className="w-full text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 py-2 rounded-lg transition-colors"
        >
          기본 아이콘으로 복구
        </button>
      </div>
    </div>,
    document.body
  );
}
