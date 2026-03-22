'use client';

import { useAiStore } from '@/store/aiStore';
import { useCallback } from 'react';

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

    try {
      const worldContext = useAiStore.getState().worldContext.map(c => c.content);
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

        // Parse full text into 3 suggestions [1] [2] [3]
        const parts = fullText.split(/\[\d\]/).filter(p => p.trim().length > 0);
        parts.forEach((part, index) => {
          if (index < 3) {
            updateSuggestion(index, part.trim());
          }
        });
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
