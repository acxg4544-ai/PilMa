'use client';

import * as React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

import { useAiStore } from '@/store/aiStore';
import { AiPanel } from '@/components/ai/AiPanel';
import { LoginModal } from '@/components/auth/LoginModal';

// 인증 상태 초기화 (세션 감지)
import { useAuth } from '@/hooks/useAuth';

/**
 * 인증 초기화 컴포넌트 (실제 UI를 렌더링하지 않음)
 * useAuth 훅을 통해 Supabase onAuthStateChange를 구독
 */
function AuthInitializer() {
  useAuth(); // 세션 변경 감지 사이드이펙트만 실행
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen, sidebarWidth, aiPanelWidth, aiPanelPipMode } = useUiStore();
  const { isAiPanelOpen, triggerInsert } = useAiStore();
  const pathname = usePathname();

  // 홈 화면인 경우
  if (pathname === '/') {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] text-pm-text font-pretendard">
        <AuthInitializer />
        {children}
        <LoginModal />
      </div>
    );
  }

  // 에디터/프로젝트 단위 화면
  return (
    <div className="min-h-screen bg-pm-bg text-pm-text font-pretendard">
      {/* 인증 상태 초기화 (UI 없음) */}
      <AuthInitializer />

      <Sidebar />
      <Header />
      
      <main
        className="pt-12 min-h-screen transition-all duration-300 ease-in-out relative"
        style={{
          paddingLeft: isSidebarOpen ? `${sidebarWidth}px` : '0px',
          paddingRight: isAiPanelOpen && !aiPanelPipMode ? `${aiPanelWidth}px` : '0px',
        }}
      >
        <div className="h-full w-full py-6 px-4 flex justify-center">
          {children}
        </div>
      </main>

      <AiPanel 
        onInsert={(content) => triggerInsert(content)}
        onRefresh={() => {}}
      />

      {/* 로그인 모달 (전역 표시) */}
      <LoginModal />
    </div>
  );
}
