'use client';

import React, { useState, useEffect } from 'react';
import { Settings, X, Save } from 'lucide-react';
import { db } from '@/lib/db';
import { useProjectStore } from '@/store/projectStore';
import { useAiStore } from '@/store/aiStore';

export function AiSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const currentProjectId = useProjectStore(state => state.currentProjectId);
  const { promptPresets, setPromptPresets } = useAiStore();
  const [localPresets, setLocalPresets] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadPresets() {
      if (!currentProjectId || !mounted) return;
      try {
        const presets = await db.prompt_presets.where('projectId').equals(currentProjectId).toArray();
        const newPresets = { ...promptPresets };
        presets.forEach(p => {
          newPresets[p.slot] = p.prompt;
        });
        setLocalPresets(newPresets);
        setPromptPresets(newPresets);
      } catch (e) {
        console.error('Failed to load presets', e);
      }
    }
    
    if (isOpen) {
      loadPresets();
    }
  }, [isOpen, currentProjectId, mounted]);

  // fallback to initialize local presets if promptPresets changes
  useEffect(() => {
    if (mounted && Object.keys(localPresets).length === 0) {
      setLocalPresets({ ...promptPresets });
    }
  }, [promptPresets, mounted]);

  const handleSave = async () => {
    if (!currentProjectId) return;
    setIsSaving(true);
    try {
      for (let i = 1; i <= 5; i++) {
        await db.prompt_presets.put({
          id: `${currentProjectId}-${i}`,
          projectId: currentProjectId,
          slot: i,
          prompt: localPresets[i] || ''
        });
      }
      setPromptPresets(localPresets);
      setIsOpen(false);
    } catch (e) {
      console.error('Failed to save presets', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return <div className="w-10 h-10" />;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all group shrink-0"
        title="AI 커스텀 프롬프트 설정 (Ctrl+1~5)"
      >
        <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-sidebar)]">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-[var(--accent)]" />
                <span className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">AI 커스텀 프롬프트 설정</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto bg-[var(--bg-editor)]">
              <div className="bg-[var(--bg-hover)]/30 border border-[var(--border)] rounded-lg p-3">
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed font-medium">
                  단축키(Ctrl+1~5)와 매핑될 AI 생성 지시문을 설정합니다.<br/>
                  텍스트 블록 지정 후 단축키를 누르면 해당 블록을 참고하여 생성합니다.
                </p>
              </div>
              
              {[1, 2, 3, 4, 5].map(slot => (
                <div key={slot} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded bg-[var(--accent)] text-white text-[10px] font-bold">
                      {slot}
                    </span>
                    <label className="text-[12px] font-bold text-[var(--text-primary)]">
                      단축키 Ctrl + {slot}
                    </label>
                  </div>
                  <textarea
                    value={localPresets[slot] || ''}
                    onChange={(e) => setLocalPresets(prev => ({ ...prev, [slot]: e.target.value }))}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = '60px';
                      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                    placeholder="예: 뒷내용을 긴장감 있게 이어줘"
                    style={{ height: '60px' }}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-4 py-2.5 text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all min-h-[60px] max-h-[120px] resize-none overflow-y-auto font-pretendard"
                  />
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-sidebar)] flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 rounded-lg text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px] font-bold transition-all hover:brightness-110 active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                <span>설정 저장</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
