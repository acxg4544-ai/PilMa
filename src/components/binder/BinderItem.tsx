'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useBinderStore } from '@/store/binderStore';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal } from 'lucide-react';
import { nanoid } from 'nanoid';
import { IconPicker } from './IconPicker';

interface BinderItemProps {
  id: string;
  type: 'volume' | 'chapter' | 'scene';
  title: string;
  level: number;
  wordCount?: number;
  icon?: string;
  isExpanded?: boolean;
  onSelect?: () => void;
  children?: React.ReactNode;
}

export function BinderItem({ id, type, title, level, wordCount, icon, isExpanded, onSelect, children }: BinderItemProps) {
  const { toggleExpanded, isRenamingId, setIsRenamingId } = useBinderStore();
  const { currentSceneId, setCurrentScene } = useUiStore();
  const [localTitle, setLocalTitle] = useState(title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSelected = type === 'scene' && currentSceneId === id;
  const isRenaming = isRenamingId === id;
  const [showIconPicker, setShowIconPicker] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: level === 0 ? '8px' : level === 1 ? '24px' : '40px',
    opacity: isDragging ? 0.5 : 1,
    scale: isDragging ? '1.02' : '1',
    zIndex: isDragging ? 999 : 'auto',
  };

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen && !showIconPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, showIconPicker]);

  const handleRename = async () => {
    if (!localTitle.trim()) {
      setLocalTitle(title);
      setIsRenamingId(null);
      return;
    }
    
    if (type === 'volume') await db.volumes.update(id, { title: localTitle });
    else if (type === 'chapter') await db.chapters.update(id, { title: localTitle });
    else if (type === 'scene') await db.scenes.update(id, { title: localTitle });
    
    setIsRenamingId(null);
  };

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까? 하위 항목도 모두 삭제됩니다.')) {
      return;
    }

    if (type === 'volume') {
      const chapters = await db.chapters.where('volumeId').equals(id).toArray();
      for (const ch of chapters) {
        await db.scenes.where('chapterId').equals(ch.id).delete();
      }
      await db.chapters.where('volumeId').equals(id).delete();
      await db.volumes.delete(id);
    } else if (type === 'chapter') {
      await db.scenes.where('chapterId').equals(id).delete();
      await db.chapters.delete(id);
    } else if (type === 'scene') {
      await db.scenes.delete(id);
      if (currentSceneId === id) {
        const nextScene = await db.scenes.toCollection().first();
        if (nextScene) setCurrentScene(nextScene.id);
        else setCurrentScene(null);
      }
    }
    setIsMenuOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (type === 'scene') {
      setCurrentScene(id);
    } else {
      toggleExpanded(id);
    }
  };

  const handleAddSubItem = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === 'volume') {
      const count = await db.chapters.where('volumeId').equals(id).count();
      await db.chapters.add({
        id: `chapter-${nanoid(8)}`,
        volumeId: id,
        title: '새 챕터',
        order: count + 1,
      });
    } else if (type === 'chapter') {
      const count = await db.scenes.where('chapterId').equals(id).count();
      const newSceneId = `scene-${nanoid(8)}`;
      await db.scenes.add({
        id: newSceneId,
        chapterId: id,
        title: '새 씬',
        order: count + 1,
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        wordCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setCurrentScene(newSceneId);
    }
  };

  const renderIcon = () => {
    if (icon) return <span className="text-[14px] leading-none flex items-center">{icon}</span>;
    if (type === 'volume') return <span className="text-[11px] leading-[1]">📁</span>;
    if (type === 'chapter') return <span className="text-[11px] leading-[1]">{isExpanded ? '📂' : '📄'}</span>;
    return <span className="text-[11px] leading-[1]">📝</span>;
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="select-none relative">
      <div
        onClick={handleClick}
        onDoubleClick={() => setIsRenamingId(id)}
        className={cn(
          "group flex items-center justify-between h-8 px-2 rounded-lg cursor-pointer transition-all text-[13px]",
          isSelected 
            ? "bg-[var(--bg-hover)] text-[var(--text-primary)] border-l-[3px] border-l-[var(--accent)]" 
            : "border-l-[3px] border-l-transparent hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          isOver && type !== 'scene' && "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-base)]"
        )}
      >
        <div className="flex items-center gap-1.5 overflow-hidden w-full">
          <div className="flex items-center flex-shrink-0 transition-transform">
            {(type === 'volume' || type === 'chapter') && (
              <span className={cn(
                "w-4 h-4 flex items-center justify-center text-[10px] text-[var(--text-disabled)] transition-transform",
                isExpanded ? "rotate-90" : ""
              )}>
                ▶
              </span>
            )}
          </div>
          <span className="flex-shrink-0 text-center w-5 flex justify-center">{renderIcon()}</span>
          {isRenaming ? (
            <input
              ref={inputRef}
              autoFocus
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="bg-[var(--bg-card)] border border-[var(--accent)] rounded-md px-1.5 py-0.5 outline-none w-full text-[var(--text-primary)] text-[13px]"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate w-full text-left">{title}</span>
          )}
        </div>
        
        <div className="flex items-center gap-1 relative">
          {/* 글자수 (호버 시 숨김) */}
          <span className={cn(
            "text-[11px] text-[var(--text-disabled)] flex-shrink-0 tabular-nums",
            "group-hover:hidden"
          )}>
            {wordCount !== undefined && wordCount > 0 && wordCount.toLocaleString()}
          </span>
          
          {/* 액션 버튼 (호버 시 표시) */}
          <div className="hidden group-hover:flex items-center gap-0.5">
            {(type === 'volume' || type === 'chapter') && (
              <button
                onClick={handleAddSubItem}
                className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 text-[13px] font-bold"
                title={type === 'volume' ? "새 챕터 추가" : "새 씬 추가"}
              >
                +
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              className={cn(
                "w-5 h-5 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                isMenuOpen && "bg-[var(--bg-hover)] text-[var(--text-primary)]"
              )}
            >
              ⋯
            </button>
          </div>
        </div>
      </div>

      {/* 드롭다운 메뉴 */}
      {isMenuOpen && (
        <div 
          ref={menuRef}
          className="absolute right-2 top-8 z-[9999] min-w-[120px] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl py-1 text-xs text-[var(--text-primary)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => { setIsRenamingId(id); setIsMenuOpen(false); }}
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors rounded-md mx-1"
            style={{ width: 'calc(100% - 8px)' }}
          >
            이름 변경
          </button>
          <button
            ref={triggerRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowIconPicker(!showIconPicker);
              setIsMenuOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors rounded-md mx-1"
            style={{ width: 'calc(100% - 8px)' }}
          >
            아이콘 변경
          </button>
          <div className="h-px bg-[var(--divider)] my-1" />
          <button 
            onClick={handleDelete}
            className="w-full text-left px-3 py-1.5 text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors rounded-md mx-1"
            style={{ width: 'calc(100% - 8px)' }}
          >
            삭제
          </button>
        </div>
      )}

      {showIconPicker && (
        <IconPicker 
          id={id} 
          type={type} 
          currentIcon={icon}
          triggerRef={triggerRef}
          onClose={() => setShowIconPicker(false)} 
        />
      )}

      {isExpanded && children}
    </div>
  );
}
