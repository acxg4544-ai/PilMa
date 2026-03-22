'use client';

import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Mail, X, Send, CheckCircle, Loader2 } from 'lucide-react';

export function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'sending') return;

    setStatus('sending');
    setErrorMsg('');

    const { error, sent } = await signInWithEmail(email.trim());
    if (sent) {
      setStatus('sent');
    } else {
      setStatus('error');
      setErrorMsg(error || '오류가 발생했습니다.');
    }
  };

  const handleClose = () => {
    closeLoginModal();
    setTimeout(() => {
      setEmail('');
      setStatus('idle');
      setErrorMsg('');
    }, 300);
  };

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
        onClick={handleClose}
      >
        {/* 모달 카드 */}
        <div
          className="relative w-full max-w-sm mx-4 bg-[var(--pm-bg-card)] rounded-xl border border-[var(--pm-border)] shadow-2xl p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 닫기 버튼 */}
          <button
            id="login-modal-close"
            onClick={handleClose}
            className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-md text-[var(--pm-text-muted)] hover:text-[var(--pm-text)] hover:bg-[var(--pm-bg-hover)] transition-all"
            aria-label="닫기"
          >
            <X size={16} />
          </button>

          {/* 헤더 */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-[var(--pm-accent)] flex items-center justify-center">
              <span className="text-white text-xl font-bold">筆</span>
            </div>
            <div className="text-center">
              <h2 className="text-[16px] font-bold text-[var(--pm-text)]">필마에 로그인</h2>
              <p className="text-[12px] text-[var(--pm-text-sub)] mt-1">
                이메일 매직링크로 비밀번호 없이 로그인
              </p>
            </div>
          </div>

          {/* 내용 */}
          {status === 'sent' ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-[var(--pm-success)]/10 flex items-center justify-center">
                <CheckCircle size={28} className="text-[var(--pm-success)]" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-[var(--pm-text)]">매직링크가 발송되었습니다!</p>
                <p className="text-[13px] text-[var(--pm-text-sub)] mt-2">
                  <span className="font-medium text-[var(--pm-accent)]">{email}</span>으로<br />
                  로그인 링크를 보냈습니다.<br />
                  이메일을 확인해 주세요.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-2 text-[13px] text-[var(--pm-text-muted)] hover:text-[var(--pm-text)] underline transition-colors"
              >
                닫기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pm-text-muted)] pointer-events-none"
                />
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소를 입력하세요"
                  required
                  autoFocus
                  className="w-full pl-9 pr-4 py-3 rounded-lg border border-[var(--pm-border)] bg-[var(--pm-bg-base)] text-[var(--pm-text)] text-[13px] placeholder:text-[var(--pm-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pm-accent)]/50 focus:border-[var(--pm-accent)] transition-all"
                />
              </div>

              {/* 오류 메시지 */}
              {status === 'error' && (
                <p className="text-[12px] text-[var(--pm-danger)] bg-[var(--pm-danger)]/10 px-3 py-2 rounded-lg">
                  ⚠️ {errorMsg}
                </p>
              )}

              <button
                id="login-submit-btn"
                type="submit"
                disabled={!email.trim() || status === 'sending'}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[var(--pm-accent)] text-white text-[13px] font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    발송 중...
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    매직링크 받기
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-[var(--pm-text-muted)] leading-relaxed">
                로그인 후 작업 내용을 클라우드에<br />동기화할 수 있습니다.
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
