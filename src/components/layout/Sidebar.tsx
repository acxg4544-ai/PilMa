'use client';

import * as React from 'react';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Binder } from '@/components/binder/Binder';
import { PankkalPanel } from '@/components/pankkal/PankkalPanel';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { useProjectStore } from '@/store/projectStore';

export function Sidebar() {
  const { isSidebarOpen, toggleSidebar, sidebarWidth, setSidebarWidth } = useUiStore();
  const { projects, currentProjectId } = useProjectStore();
  
  const currentProject = React.useMemo(() => {
    return projects.find((p: any) => p.id === currentProjectId);
  }, [projects, currentProjectId]);

  return (
    <>
      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 flex flex-col bg-pm-panel text-pm-text transition-transform duration-300 ease-in-out border-r border-pm-border overflow-hidden shadow-[2px_0_8px_rgba(0,0,0,0.05)]',
          !isSidebarOpen && '-translate-x-full'
        )}
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* 로고 + 접기 버튼 */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-pm-divider shrink-0 gap-3">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-[18px] text-pm-accent tracking-tighter select-none leading-tight">
              필마 筆魔
            </span>
            {currentProject && (
              <span className="text-[11px] text-[var(--text-secondary)] font-medium truncate w-full" title={currentProject.title}>
                {currentProject.title}
              </span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all shrink-0"
            title="사이드바 닫기"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        
        {/* 바인더 영역 */}
        <div className="flex-1 flex flex-col min-h-0">
          <Binder />
        </div>

        {/* 판깔 세계관 섹션 */}
        <div className="mt-auto px-1 py-1">
          <div className="h-px bg-[var(--divider)] mx-3 mb-2 opacity-60" />
          <div className="px-3 mb-1">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest pl-1">세계관 월드빌딩</span>
          </div>
          <PankkalPanel />
        </div>
      </aside>

      {/* 리사이즈 핸들 (사이드바 메뉴가 열렸을 때만 표시) */}
      {isSidebarOpen && (
        <div className="hidden md:block fixed inset-y-0 z-30 pointer-events-none" style={{ left: `${sidebarWidth}px` }}>
          <div className="relative h-full pointer-events-auto">
            <ResizeHandle
              direction="right"
              minWidth={200}
              maxWidth={400}
              width={sidebarWidth}
              onResize={setSidebarWidth}
            />
          </div>
        </div>
      )}


      {/* 사이드바 닫혔을 때 플로팅 버튼 */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-[10px] left-3 z-30 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all"
          title="사이드바 열기"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}
    </>
  );
}
