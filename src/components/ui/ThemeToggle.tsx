'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';

// 테마 정의: 아이콘, 레이블, 다음 테마 순환 순서
const THEMES = [
  { key: 'green', icon: '🌿', label: '그린 모드' },
  { key: 'dark',  icon: '🌙', label: '다크 모드' },
  { key: 'light', icon: '☀️', label: '라이트 모드' },
] as const;

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // SSR 하이드레이션 불일치 방지
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="w-7 h-7" />;

  const currentIndex = THEMES.findIndex(t => t.key === theme);
  const current = THEMES[currentIndex] ?? THEMES[0];
  const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];

  return (
    <button
      id="theme-toggle-btn"
      onClick={() => setTheme(nextTheme.key)}
      className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
      title={`현재: ${current.label} → ${nextTheme.label}으로 전환`}
    >
      <span className="text-[15px] leading-none select-none">{current.icon}</span>
      <span className="sr-only">테마 전환</span>
    </button>
  );
}
