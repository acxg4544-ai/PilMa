'use client';

import * as React from 'react';
import { useUiStore } from '@/store/uiStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SyncButton } from '@/components/ui/SyncButton';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, LogOut, LogIn, ArrowLeft } from 'lucide-react';
import { AiSettings } from '@/components/ai/AiSettings';
import { SummaryUploader } from '@/components/ai/SummaryUploader';
import { useAiStore } from '@/store/aiStore';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useProjectStore } from '@/store/projectStore';

export function Header() {
  const { isSidebarOpen, wordCount, saveStatus, aiPanelWidth, aiPanelPipMode } = useUiStore();
  const { isAiPanelOpen } = useAiStore();
  const { user, signOut, openLoginModal, isLoading } = useAuth();
  const router = useRouter();
  const currentProjectId = useProjectStore(state => state.currentProjectId);
  
  const project = useLiveQuery(() => 
    currentProjectId ? db.projects.get(currentProjectId) : undefined
  , [currentProjectId]);

  return (
    <header
      className={cn(
        'fixed top-0 z-10 flex items-center justify-between h-12 px-5 bg-pm-panel border-b border-pm-divider transition-all duration-300',
        isSidebarOpen ? 'left-[260px]' : 'left-0'
      )}
      style={{
        right: (isAiPanelOpen && !aiPanelPipMode) ? `${aiPanelWidth}px` : '0px'
      }}
    >
      {/* 좌측: 홈 버튼 + 프로젝트명 + 저장 상태 */}
      <div className={cn('flex items-center gap-3 transition-all', !isSidebarOpen && 'ml-10')}>
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors pr-3 border-r border-[var(--divider)]"
          title="홈으로 가기"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-[14px] font-semibold text-[var(--text-primary)] line-clamp-1 max-w-[200px]">
          {project?.title || '필마'}
        </h1>
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-1 text-[11px] text-pm-text-sub">
            <Clock size={12} className="animate-spin" />
            저장 중...
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-1 text-[11px] text-pm-success">
            <CheckCircle size={12} />
            저장됨
          </div>
        )}
      </div>

      {/* 우측: 글자수 + AI 기능 + 동기화 + 로그인 + 테마 */}
      <div className="flex items-center gap-2">
        {/* 글자수 배지 */}
        <div className="text-[12px] bg-[var(--bg-hover)] text-[var(--accent)] px-3 py-1 rounded-xl font-semibold tabular-nums select-none">
          공백 포함 {wordCount.toLocaleString()}자
        </div>

        {/* AI 기능 (요약 업로드, 설정) */}
        <div className="flex items-center gap-1 mx-1">
          <SummaryUploader />
          <AiSettings />
        </div>

        {/* 동기화 버튼 */}
        <SyncButton />

        {/* 구분선 */}
        <div className="w-px h-4 bg-[var(--divider)] mx-0.5" />

        {/* 로그인 / 로그아웃 */}
        {isLoading ? (
          <div className="w-6 h-6" />
        ) : user ? (
          <button
            id="logout-btn"
            onClick={signOut}
            title={`로그아웃 (${user.email})`}
            className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--pm-text-sub)] hover:text-[var(--pm-text)] hover:bg-[var(--pm-bg-hover)] transition-all"
          >
            <LogOut size={15} />
          </button>
        ) : (
          <button
            id="login-btn"
            onClick={openLoginModal}
            title="로그인"
            className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
          >
            <LogIn size={15} />
          </button>
        )}

        {/* 구분선 */}
        <div className="w-px h-4 bg-[var(--divider)] mx-0.5" />

        {/* 다크모드 토글 */}
        <ThemeToggle />
      </div>
    </header>
  );
}
