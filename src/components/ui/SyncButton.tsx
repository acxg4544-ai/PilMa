'use client';

import * as React from 'react';
import { useSync, type SyncStatus } from '@/hooks/useSync';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CloudUpload, CloudDownload, Lock } from 'lucide-react';

interface SyncButtonProps {
  className?: string;
}

/**
 * Push·Pull·잠금 버튼 컴포넌트
 */
export function SyncButton({ className = '' }: SyncButtonProps) {
  const { user, openLoginModal } = useAuth();
  const { syncStatus, pushToCloud, pullFromCloud } = useSync();

  // 비로그인 상태
  if (!user) {
    return (
      <button
        id="sync-locked-btn"
        onClick={openLoginModal}
        title="로그인하면 클라우드 동기화를 사용할 수 있습니다"
        className={`w-6 h-6 flex items-center justify-center rounded-md text-[var(--pm-text-muted)] hover:text-[var(--pm-text-sub)] hover:bg-[var(--pm-bg-hover)] transition-all ${className}`}
      >
        <Lock size={15} />
      </button>
    );
  }

  // Push 버튼 아이콘
  const PushIcon = () => {
    if (syncStatus === 'pushing') return <Loader2 size={15} className="animate-spin text-[var(--pm-accent)]" />;
    if (syncStatus === 'success') return <CloudUpload size={15} className="text-[var(--pm-success)]" />;
    if (syncStatus === 'error') return <CloudUpload size={15} className="text-[var(--pm-danger)]" />;
    return <CloudUpload size={15} />;
  };

  const isPushDisabled = syncStatus === 'pushing' || syncStatus === 'pulling';
  const isPullDisabled = syncStatus === 'pushing' || syncStatus === 'pulling';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Push 버튼 */}
      <button
        id="sync-push-btn"
        onClick={pushToCloud}
        disabled={isPushDisabled}
        title={
          syncStatus === 'pushing'
            ? '동기화 중...'
            : syncStatus === 'success'
            ? '동기화 완료!'
            : '클라우드에 저장 (Push)'
        }
        className={`w-6 h-6 flex items-center justify-center rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed
          ${syncStatus === 'success'
            ? 'text-[var(--pm-success)]'
            : syncStatus === 'error'
            ? 'text-[var(--pm-danger)]'
            : 'text-[var(--pm-text-sub)] hover:text-[var(--pm-text)] hover:bg-[var(--pm-bg-hover)]'
          }`}
      >
        <PushIcon />
      </button>

      {/* Pull 버튼 */}
      <button
        id="sync-pull-btn"
        onClick={pullFromCloud}
        disabled={isPullDisabled}
        title={syncStatus === 'pulling' ? '가져오는 중...' : '클라우드에서 불러오기 (Pull)'}
        className={`w-6 h-6 flex items-center justify-center rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed
          ${syncStatus === 'pulling'
            ? 'text-[var(--pm-accent)]'
            : 'text-[var(--pm-text-sub)] hover:text-[var(--pm-text)] hover:bg-[var(--pm-bg-hover)]'
          }`}
      >
        {syncStatus === 'pulling' ? (
          <Loader2 size={15} className="animate-spin text-[var(--pm-accent)]" />
        ) : (
          <CloudDownload size={15} />
        )}
      </button>
    </div>
  );
}
