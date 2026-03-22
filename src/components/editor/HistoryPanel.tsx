'use client';

import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Clock, Eye, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDrag } from '@/hooks/useDrag';

interface HistoryItem {
  content: any;
  savedAt: number;
  charCount: number;
}

interface HistoryPanelProps {
  sceneId: string;
  onRestore: (content: any) => void;
  onClose: () => void;
}

export function HistoryPanel({ sceneId, onRestore, onClose }: HistoryPanelProps) {
  const [backups, setBackups] = useState<HistoryItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Position and size state
  const [pos, setPos] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth - 450 : 0, 
    y: typeof window !== 'undefined' ? 100 : 0, 
    w: 400, 
    h: 500 
  });

  const { handleDragStart, handleResizeStart } = useDrag({
    position: pos,
    onPositionChange: (newPos) => {
      setPos(newPos);
      localStorage.setItem('pilma_history_pos', JSON.stringify(newPos));
    },
    minWidth: 320,
    minHeight: 250
  });

  useEffect(() => {
    // Load backups from localStorage
    const saved = localStorage.getItem(`pilma_backup_${sceneId}`);
    if (saved) {
      try {
        setBackups(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }

    // Load panel position
    const savedPos = localStorage.getItem('pilma_history_pos');
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        setPos(prev => ({ 
          ...prev, 
          x: Math.min(parsed.x, window.innerWidth - 50),
          y: Math.min(parsed.y, window.innerHeight - 50)
        }));
      } catch (e) {}
    }
  }, [sceneId]);

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  };

  const getPreviewText = (content: any) => {
    if (!content) return '';
    
    // TipTap JSON에서 텍스트 추출
    let text = '';
    const extractText = (node: any) => {
      if (node.text) text += node.text;
      if (node.content) node.content.forEach(extractText);
    };
    
    try {
      if (Array.isArray(content.content)) {
        content.content.forEach(extractText);
      } else if (content.type === 'doc') {
        extractText(content);
      }
    } catch (e) {}
    
    return text.slice(0, 200) + (text.length > 200 ? '...' : '');
  };

  const handleRestoreClick = (content: any) => {
    onRestore(content);
  };

  return (
    <div 
      className="fixed z-[9999] flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.3)] overflow-hidden backdrop-blur-md"
      style={{
        left: pos.x,
        top: pos.y,
        width: pos.w,
        height: pos.h,
      }}
    >
      {/* Title Bar */}
      <div 
        className="h-10 px-4 flex items-center justify-between bg-[var(--bg-sidebar)] border-b border-[var(--border)] cursor-grab active:cursor-grabbing shrink-0"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[var(--accent)]" />
          <span className="text-[13px] font-bold text-[var(--text-primary)]">기록 보관소</span>
        </div>
        <button 
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50">
            <Clock size={32} />
            <p className="text-[12px]">아직 백업된 기록이 없습니다.</p>
          </div>
        ) : (
          backups.map((item, index) => (
            <div 
              key={index}
              className={cn(
                "group p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] transition-all",
                previewIndex === index ? "ring-2 ring-[var(--accent)]" : "hover:border-[var(--accent)]/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-[var(--text-primary)]">{getTimeAgo(item.savedAt)}</span>
                  <span className="text-[10px] text-[var(--text-disabled)]">{new Date(item.savedAt).toLocaleTimeString()} · {item.charCount.toLocaleString()}자</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => setPreviewIndex(previewIndex === index ? null : index)}
                    className={cn(
                      "p-1 rounded-md transition-colors",
                      previewIndex === index ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                    )}
                    title="미리보기"
                  >
                    <Eye size={14} />
                  </button>
                  <button 
                    onClick={() => handleRestoreClick(item.content)}
                    className="p-1 rounded-md hover:bg-[var(--accent)]/10 text-[var(--accent)] transition-colors"
                    title="복구"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              {previewIndex === index && (
                <div className="mt-2 p-2.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] leading-relaxed animate-in fade-in slide-in-from-top-1">
                  <p className="whitespace-pre-wrap line-clamp-6" style={{ fontFamily: 'var(--font-noto-serif-kr)' }}>
                    {getPreviewText(item.content)}
                  </p>
                  <button 
                    onClick={() => handleRestoreClick(item.content)}
                    className="mt-3 w-full py-2 bg-[var(--accent)] text-white font-bold rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={14} />
                    <span>이 버전으로 복구</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize active:cursor-nwse-resize group"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-[var(--text-disabled)] group-hover:border-[var(--accent)]" />
      </div>
    </div>
  );
}
