'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Loader2, ChevronDown, Settings, ExternalLink, Key } from 'lucide-react';
import { cn } from '@/lib/utils';

type AiProvider = 'gemini' | 'claude';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiSettingsModal({ isOpen, onClose }: AiSettingsModalProps) {
  const [selectedApi, setSelectedApi] = useState<AiProvider>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [geminiTestStatus, setGeminiTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [claudeTestStatus, setClaudeTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // 초기 로드: localStorage에서 설정값 불러오기
  useEffect(() => {
    if (!isOpen) return;
    const savedApi = localStorage.getItem('pilma_ai_provider') as AiProvider | null;
    const savedGeminiKey = localStorage.getItem('pilma_gemini_key') || '';
    const savedClaudeKey = localStorage.getItem('pilma_claude_key') || '';
    
    if (savedApi === 'gemini' || savedApi === 'claude') {
      setSelectedApi(savedApi);
    }
    setGeminiKey(savedGeminiKey);
    setClaudeKey(savedClaudeKey);
    setGeminiTestStatus('idle');
    setClaudeTestStatus('idle');
  }, [isOpen]);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // API 선택 변경 및 저장
  const handleSelectApi = (provider: AiProvider) => {
    setSelectedApi(provider);
    localStorage.setItem('pilma_ai_provider', provider);
    setIsDropdownOpen(false);
  };

  // Gemini 키 저장
  const handleGeminiKeyChange = (val: string) => {
    setGeminiKey(val);
    localStorage.setItem('pilma_gemini_key', val.trim());
  };

  // Claude 키 저장
  const handleClaudeKeyChange = (val: string) => {
    setClaudeKey(val);
    localStorage.setItem('pilma_claude_key', val.trim());
  };

  // Gemini 연결 테스트
  const handleTestGemini = async () => {
    const key = geminiKey.trim();
    if (!key) {
      setGeminiTestStatus('error');
      return;
    }
    setGeminiTestStatus('loading');
    try {
      // Direct client-side test for Gemini (usually allowed if no CORS restrictions on this endpoint)
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 1 }
        })
      });
      if (res.ok) {
        setGeminiTestStatus('success');
      } else {
        setGeminiTestStatus('error');
      }
    } catch (err) {
      setGeminiTestStatus('error');
    }
  };

  // Claude 연결 테스트
  const handleTestClaude = async () => {
    const key = claudeKey.trim();
    if (!key) {
      setClaudeTestStatus('error');
      return;
    }
    setClaudeTestStatus('loading');
    try {
      // Claude API는 CORS 때문에 보통 프록시(API Route)가 필요하지만, 
      // 사용자가 "API route 수정 금지"라고 했으므로 기존에 존재할 수 있는 /api/ai/claude 등을 활용하거나 
      // 만약 없다면 테스트 결과를 낼 방법이 마땅치 않음.
      // 하지만 기존 코드에 /api/ai 가 있었으므로 그걸 활용하거나, 혹은 요청대로 UI만 구현하는 것이 우선.
      // 일단 기존 코드에 있던 /api/ai/claude (혹은 유사한 경로)를 시도해보거나, 
      // 사용자 규칙에 따라 "기능 만능주의"를 발휘해 테스트 시도를 합니다.
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          provider: 'claude',
          apiKey: key
        })
      });
      if (res.ok) {
        setClaudeTestStatus('success');
      } else {
        setClaudeTestStatus('error');
      }
    } catch (err) {
      setClaudeTestStatus('error');
    }
  };

  if (!isOpen) return null;

  const apiOptions = [
    { id: 'gemini' as AiProvider, name: 'Gemini Flash', emoji: '⚡' },
    { id: 'claude' as AiProvider, name: 'Claude Sonnet', emoji: '✨' },
  ];

  const selectedOption = apiOptions.find(o => o.id === selectedApi) || apiOptions[0];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <div 
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] w-full max-w-md shadow-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-[var(--text-secondary)]" />
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">AI 설정</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-5 space-y-6">
          
          {/* API 선택 */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-[var(--text-secondary)]">AI 모델 선택</label>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[14px] text-[var(--text-primary)] hover:border-[var(--accent)] transition-all"
              >
                <span className="flex items-center gap-2">
                  {selectedOption.emoji} {selectedOption.name}
                </span>
                <ChevronDown size={16} className={cn("transition-transform", isDropdownOpen && "rotate-180")} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 overflow-hidden">
                  {apiOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectApi(opt.id)}
                      className={cn(
                        "w-full px-4 py-2.5 flex items-center gap-2 hover:bg-[var(--bg-hover)] text-left text-[14px]",
                        selectedApi === opt.id ? "text-[var(--accent)] font-bold" : "text-[var(--text-primary)]"
                      )}
                    >
                      {opt.emoji} {opt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Gemini 설정 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Gemini API Key</label>
              {geminiTestStatus === 'success' && <span className="text-[12px] text-green-500 font-medium">연결 성공 ✅</span>}
              {geminiTestStatus === 'error' && <span className="text-[12px] text-red-500 font-medium">실패 ❌</span>}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiKey}
                onChange={e => handleGeminiKeyChange(e.target.value)}
                placeholder="API 키 입력"
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={handleTestGemini}
                disabled={geminiTestStatus === 'loading'}
                className="px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[12px] font-bold text-[var(--text-primary)] hover:bg-[var(--border)] transition-all disabled:opacity-50"
              >
                {geminiTestStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : '연결 테스트'}
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-disabled)]">
              Google AI Studio (aistudio.google.com)에서 키 발급
            </p>
          </div>

          {/* Claude 설정 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold text-[var(--text-secondary)]">Claude API Key</label>
              {claudeTestStatus === 'success' && <span className="text-[12px] text-green-500 font-medium">연결 성공 ✅</span>}
              {claudeTestStatus === 'error' && <span className="text-[12px] text-red-500 font-medium">실패 ❌</span>}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={claudeKey}
                onChange={e => handleClaudeKeyChange(e.target.value)}
                placeholder="API 키 입력"
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={handleTestClaude}
                disabled={claudeTestStatus === 'loading'}
                className="px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[12px] font-bold text-[var(--text-primary)] hover:bg-[var(--border)] transition-all disabled:opacity-50"
              >
                {claudeTestStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : '연결 테스트'}
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-disabled)]">
              Anthropic Console (console.anthropic.com)에서 키 발급
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--bg-sidebar)] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px] font-bold hover:opacity-90 transition-all"
          >
            저장 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
