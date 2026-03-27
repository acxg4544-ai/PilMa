'use client';

import { useAiStore } from '@/store/aiStore';
import { useCallback } from 'react';

/**
 * AI 문장 추천 훅 - Gemini / Claude 분기 처리
 * localStorage의 'pilma_ai_provider'에 따라 호출 대상 API가 결정됨
 */
export function useAiSuggest() {
  const setAiLoading = useAiStore((state) => state.setAiLoading);
  const setAiPanelOpen = useAiStore((state) => state.setAiPanelOpen);
  const setSuggestions = useAiStore((state) => state.setSuggestions);
  const updateSuggestion = useAiStore((state) => state.updateSuggestion);
  const setAiError = useAiStore((state) => state.setAiError);
  const setLastUsedPrompt = useAiStore((state) => state.setLastUsedPrompt);

  const fetchSuggestions = useCallback(async (
    context: string, 
    plot: string,
    selectedText: string = '',
    customPrompt: string = '',
    fileUri: string = ''
  ) => {
    setAiLoading(true);
    setAiPanelOpen(true);
    setSuggestions(['', '', '']);
    setAiError(null);
    setLastUsedPrompt(customPrompt || '다음에 올 문장 제안');

    // API 분기: localStorage에서 선택된 AI 엔진 확인
    const provider = localStorage.getItem('pilma_ai_provider') || 'gemini';
    const isClaudeMode = provider === 'claude';

    try {
      const worldContext = useAiStore.getState().worldContext.map(c => `[${c.title}]\n${c.content}`);

      if (isClaudeMode) {
        // Claude API 호출 (apiKey를 body에 포함)
        const claudeApiKey = localStorage.getItem('pilma_claude_key') || '';
        if (!claudeApiKey) {
          setAiError('CLAUDE_API_KEY_NOT_FOUND');
          return;
        }

        const response = await fetch('/api/ai/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, worldContext, plot, selectedText, customPrompt, fileUri, apiKey: claudeApiKey }),
        });

        if (!response.ok) {
          const errData = await response.json();
          if (errData.error === 'CLAUDE_API_KEY_NOT_FOUND') {
            setAiError('CLAUDE_API_KEY_NOT_FOUND');
          } else {
            throw new Error(errData.error || 'Claude API Error');
          }
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          fullText += chunk;

          // [1] [2] [3] 파싱
          const parts = fullText.split(/\[\d\]/).filter(p => p.trim().length > 0);
          parts.forEach((part, index) => {
            if (index < 3) {
              updateSuggestion(index, part.trim());
            }
          });
        }
      } else {
        // Gemini API 호출 (기존 로직)
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, worldContext, plot, selectedText, customPrompt, fileUri }),
        });

        if (!response.ok) {
          const errData = await response.json();
          if (errData.error === 'API_KEY_NOT_FOUND') {
            setAiError('API_KEY_NOT_FOUND');
          } else {
            throw new Error('AI Error');
          }
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          fullText += chunk;

          // [1] [2] [3] 파싱
          const parts = fullText.split(/\[\d\]/).filter(p => p.trim().length > 0);
          parts.forEach((part, index) => {
            if (index < 3) {
              updateSuggestion(index, part.trim());
            }
          });
        }
      }
    } catch (e) {
      console.error('AI Request failed', e);
      setAiError('UNKNOWN');
    } finally {
      setAiLoading(false);
    }
  }, [setAiLoading, setAiPanelOpen, setSuggestions, updateSuggestion, setAiError]);

  return { fetchSuggestions };
}
