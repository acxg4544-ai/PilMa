'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

/**
 * 인증 상태를 관리하는 훅
 * - Supabase 세션 변경 감지
 * - 로그인/로그아웃 처리
 */
export function useAuth() {
  const { user, session, isLoading, isLoginModalOpen, setSession, setIsLoading, openLoginModal, closeLoginModal } =
    useAuthStore();

  useEffect(() => {
    // 현재 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // 세션 변경 이벤트 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
      // 로그인 성공 시 모달 닫기
      if (session) {
        closeLoginModal();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setIsLoading, closeLoginModal]);

  /**
   * 이메일 매직링크로 로그인
   */
  const signInWithEmail = async (email: string): Promise<{ error: string | null; sent: boolean }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // 로그인 후 현재 페이지로 리다이렉트
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) return { error: error.message, sent: false };
      return { error: null, sent: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      return { error: msg, sent: false };
    }
  };

  /**
   * 로그아웃
   */
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    isLoading,
    isLoginModalOpen,
    openLoginModal,
    closeLoginModal,
    signInWithEmail,
    signOut,
  };
}
