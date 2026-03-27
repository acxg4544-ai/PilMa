'use client';

import React, { useState, useEffect } from 'react';
import { Settings, X, Save, Trash2, Plus, MessageSquare, Replace, Book, Sparkles, Key, Loader2, Check, ChevronDown } from 'lucide-react';
import { db, TextReplacement, Dictionary } from '@/lib/db';
import { useProjectStore } from '@/store/projectStore';
import { useAiStore } from '@/store/aiStore';
import { cn } from '@/lib/utils';

export function AiSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'replace' | 'dict' | 'model'>('prompt');
  const currentProjectId = useProjectStore(state => state.currentProjectId);
  const { promptPresets, setPromptPresets } = useAiStore();
  const [localPresets, setLocalPresets] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Text Replacement states
  const [replacements, setReplacements] = useState<TextReplacement[]>([]);
  const [replaceEnabled, setReplaceEnabled] = useState(true);
  const [newReplaceFrom, setNewReplaceFrom] = useState('');
  const [newReplaceTo, setNewReplaceTo] = useState('');

  // Dictionary states
  const [dictionary, setDictionary] = useState<Dictionary[]>([]);
  const [newWord, setNewWord] = useState('');
  
  // AI Model states (copied from AiSettingsModal)
  const [selectedApi, setSelectedApi] = useState<'gemini' | 'claude'>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [geminiTestStatus, setGeminiTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [claudeTestStatus, setClaudeTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isApiDropdownOpen, setIsApiDropdownOpen] = useState(false);
  const apiDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const enabled = localStorage.getItem('pilma_replace_enabled');
    if (enabled !== null) setReplaceEnabled(enabled === 'true');
  }, []);

  useEffect(() => {
    async function loadAllData() {
      if (!currentProjectId || !mounted) return;
      try {
        // Load Prompt Presets
        const presets = await db.prompt_presets.where('projectId').equals(currentProjectId).toArray();
        const newPresets = { ...promptPresets };
        presets.forEach(p => {
          newPresets[p.slot] = p.prompt;
        });
        setLocalPresets(newPresets);
        setPromptPresets(newPresets);

        // Load Replacements
        let reps = await db.text_replacements.where('projectId').equals(currentProjectId).toArray();
        if (reps.length === 0) {
          // Create default presets
          const defaults = [
            { from: '>>', to: '》' }, { from: '<<', to: '《' },
            { from: ']]', to: '】' }, { from: '[[', to: '【' },
            { from: '...', to: '…' }, { from: '->', to: '→' },
            { from: '<-', to: '←' }, { from: '(c)', to: '©' }
          ];
          const toAdd = defaults.map(d => ({
            id: crypto.randomUUID(),
            projectId: currentProjectId,
            ...d
          }));
          await db.text_replacements.bulkAdd(toAdd);
          reps = await db.text_replacements.where('projectId').equals(currentProjectId).toArray();
        }
        setReplacements(reps);

        // Load Dictionary
        const dict = await db.dictionary.where('projectId').equals(currentProjectId).toArray();
        setDictionary(dict);

        // Load AI Model settings from localStorage
        const savedApi = localStorage.getItem('pilma_ai_provider') as 'gemini' | 'claude' | null;
        const savedGeminiKey = localStorage.getItem('pilma_gemini_key') || '';
        const savedClaudeKey = localStorage.getItem('pilma_claude_key') || '';
        if (savedApi) setSelectedApi(savedApi);
        setGeminiKey(savedGeminiKey);
        setClaudeKey(savedClaudeKey);

      } catch (e) {
        console.error('Failed to load settings data', e);
      }
    }
    
    if (isOpen) {
      loadAllData();
      setGeminiTestStatus('idle');
      setClaudeTestStatus('idle');
    }
  }, [isOpen, currentProjectId, mounted]);

  // 드롭다운 외부 클릭 닫기 (Effect)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (apiDropdownRef.current && !apiDropdownRef.current.contains(e.target as Node)) {
        setIsApiDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // AI Model handlers
  const handleSelectApi = (provider: 'gemini' | 'claude') => {
    setSelectedApi(provider);
    localStorage.setItem('pilma_ai_provider', provider);
    setIsApiDropdownOpen(false);
  };
  const handleGeminiKeyChange = (val: string) => {
    setGeminiKey(val);
    localStorage.setItem('pilma_gemini_key', val.trim());
  };
  const handleClaudeKeyChange = (val: string) => {
    setClaudeKey(val);
    localStorage.setItem('pilma_claude_key', val.trim());
  };
  const handleTestGemini = async () => {
    const key = geminiKey.trim();
    if (!key) { setGeminiTestStatus('error'); return; }
    setGeminiTestStatus('loading');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }], generationConfig: { maxOutputTokens: 1 } })
      });
      setGeminiTestStatus(res.ok ? 'success' : 'error');
    } catch { setGeminiTestStatus('error'); }
  };
  const handleTestClaude = async () => {
    const key = claudeKey.trim();
    if (!key) { setClaudeTestStatus('error'); return; }
    setClaudeTestStatus('loading');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', provider: 'claude', apiKey: key })
      });
      setClaudeTestStatus(res.ok ? 'success' : 'error');
    } catch { setClaudeTestStatus('error'); }
  };

  const handleSavePrompt = async () => {
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

  const handleAddReplacement = async () => {
    if (!currentProjectId || !newReplaceFrom.trim()) return;
    const newItem: TextReplacement = {
      id: crypto.randomUUID(),
      projectId: currentProjectId,
      from: newReplaceFrom.trim(),
      to: newReplaceTo
    };
    await db.text_replacements.add(newItem);
    setReplacements(prev => [...prev, newItem]);
    setNewReplaceFrom('');
    setNewReplaceTo('');
  };

  const handleDeleteReplacement = async (id: string) => {
    await db.text_replacements.delete(id);
    setReplacements(prev => prev.filter(r => r.id !== id));
  };

  const handleAddWord = async () => {
    if (!currentProjectId || !newWord.trim()) return;
    const newItem: Dictionary = {
      id: crypto.randomUUID(),
      projectId: currentProjectId,
      word: newWord.trim()
    };
    await db.dictionary.add(newItem);
    setDictionary(prev => [...prev, newItem]);
    setNewWord('');
  };

  const handleDeleteWord = async (id: string) => {
    await db.dictionary.delete(id);
    setDictionary(prev => prev.filter(w => w.id !== id));
  };

  const toggleReplace = (val: boolean) => {
    setReplaceEnabled(val);
    localStorage.setItem('pilma_replace_enabled', String(val));
  };

  if (!mounted) return <div className="w-10 h-10" />;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all group shrink-0"
        title="AI 및 텍스트 설정 (프롬프트/대치/단어장)"
      >
        <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[70vh]" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-sidebar)] shrink-0">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-[var(--accent)]" />
                <span className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">AI 및 텍스트 설정</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-[var(--border)] bg-[var(--bg-sidebar)] shrink-0">
              <button 
                onClick={() => setActiveTab('prompt')}
                className={cn(
                  "flex-1 py-3 text-[13px] font-bold flex items-center justify-center gap-2 transition-all border-b-2",
                  activeTab === 'prompt' ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <MessageSquare size={16} />
                <span>프롬프트 슬롯</span>
              </button>
              <button 
                onClick={() => setActiveTab('replace')}
                className={cn(
                  "flex-1 py-3 text-[13px] font-bold flex items-center justify-center gap-2 transition-all border-b-2",
                  activeTab === 'replace' ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Replace size={16} />
                <span>텍스트 대치</span>
              </button>
              <button 
                onClick={() => setActiveTab('dict')}
                className={cn(
                  "flex-1 py-3 text-[13px] font-bold flex items-center justify-center gap-2 transition-all border-b-2",
                  activeTab === 'dict' ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Book size={16} />
                <span>단어장</span>
              </button>
              <button 
                onClick={() => setActiveTab('model')}
                className={cn(
                  "flex-1 py-3 text-[13px] font-bold flex items-center justify-center gap-2 transition-all border-b-2",
                  activeTab === 'model' ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <Sparkles size={16} />
                <span>AI 모델</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-[var(--bg-editor)] p-6">
              {activeTab === 'prompt' && (
                <div className="space-y-5">
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
                        placeholder="예: 뒷내용을 긴장감 있게 이어줘"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-4 py-2.5 text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all min-h-[60px] max-h-[120px] resize-none font-pretendard"
                      />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'replace' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-[var(--text-primary)]">자동 텍스트 대치</span>
                      <span className="text-[12px] text-[var(--text-secondary)]">입력 즉시 지정한 텍스트로 변경합니다 (예: ... -&gt; …)</span>
                    </div>
                    <button 
                      onClick={() => toggleReplace(!replaceEnabled)}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 transition-all duration-300",
                        replaceEnabled ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                      )}
                    >
                      <div className={cn("w-4 h-4 bg-white rounded-full transition-all", replaceEnabled ? "translate-x-6" : "translate-x-0")} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-[1fr_1fr_40px] gap-2 px-2 text-[11px] font-bold text-[var(--text-disabled)] uppercase tracking-wider">
                      <span>대상 텍스트</span>
                      <span>대치 결과</span>
                      <span className="text-center">삭제</span>
                    </div>
                    <div className="space-y-1">
                      {replacements.map(rep => (
                        <div key={rep.id} className="grid grid-cols-[1fr_1fr_40px] items-center gap-2 p-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text-primary)]">
                          <code className="text-[var(--accent)] font-medium bg-[var(--accent)]/5 px-2 py-0.5 rounded">{rep.from}</code>
                          <span className="font-medium">{rep.to}</span>
                          <button onClick={() => handleDeleteReplacement(rep.id)} className="flex items-center justify-center text-[var(--text-disabled)] hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-[var(--bg-sidebar)] rounded-xl border border-[var(--border)]">
                    <input 
                      type="text" 
                      placeholder="대상 (예: ...)" 
                      value={newReplaceFrom}
                      onChange={e => setNewReplaceFrom(e.target.value)}
                      className="flex-1 min-w-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
                    />
                    <span className="text-[var(--text-disabled)]">→</span>
                    <input 
                      type="text" 
                      placeholder="결과 (예: …)" 
                      value={newReplaceTo}
                      onChange={e => setNewReplaceTo(e.target.value)}
                      className="flex-1 min-w-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
                    />
                    <button 
                      onClick={handleAddReplacement}
                      className="w-8 h-8 flex items-center justify-center bg-[var(--accent)] text-white rounded-lg hover:brightness-110 active:scale-90 transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'dict' && (
                <div className="space-y-6">
                  <div className="bg-[var(--bg-hover)]/30 border border-[var(--border)] rounded-lg p-3">
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed font-medium">
                      등록된 단어는 맞춤법 검사 결과에서 제외됩니다.<br/>
                      작품 고유 명사나 설정어 등을 등록해 관리하세요.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="추가할 단어 입력..." 
                      value={newWord}
                      onChange={e => setNewWord(e.target.value)}
                      className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-2 text-[14px] outline-none focus:border-[var(--accent)]"
                      onKeyDown={e => e.key === 'Enter' && handleAddWord()}
                    />
                    <button 
                      onClick={handleAddWord}
                      className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-bold text-[13px] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Plus size={16} />
                      추가
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {dictionary.map(item => (
                      <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-full text-[13px] text-[var(--text-primary)] hover:border-[var(--accent)] transition-all group">
                        <span className="font-medium">{item.word}</span>
                        <button onClick={() => handleDeleteWord(item.id)} className="opacity-0 group-hover:opacity-100 text-[var(--text-disabled)] hover:text-red-500 transition-all">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {dictionary.length === 0 && (
                      <div className="w-full text-center py-10 text-[var(--text-disabled)] text-[13px]">
                        아직 등록된 단어가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'model' && (
                <div className="space-y-6">
                  <div className="bg-[var(--bg-hover)]/30 border border-[var(--border)] rounded-lg p-3">
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed font-medium">
                      사용할 AI 엔진과 API 키를 설정합니다. <br/>
                      Gemini 또는 Claude 중 하나를 선택해 주세요.
                    </p>
                  </div>

                  {/* API Model Selection */}
                  <div className="space-y-2">
                    <label className="text-[14px] font-bold text-[var(--text-primary)]">AI 모델 선택</label>
                    <div className="relative" ref={apiDropdownRef}>
                      <button
                        onClick={() => setIsApiDropdownOpen(!isApiDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[14px] text-[var(--text-primary)] hover:border-[var(--accent)] transition-all"
                      >
                        <span className="flex items-center gap-2">
                          {selectedApi === 'gemini' ? '⚡ Gemini Flash' : '✨ Claude Sonnet'}
                        </span>
                        <ChevronDown size={16} className={cn("transition-transform", isApiDropdownOpen && "rotate-180")} />
                      </button>
                      {isApiDropdownOpen && (
                        <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-[1001] overflow-hidden">
                          <button onClick={() => handleSelectApi('gemini')} className={cn("w-full px-4 py-2.5 flex items-center gap-2 hover:bg-[var(--bg-hover)] text-left text-[14px]", selectedApi === 'gemini' ? "text-[var(--accent)] font-bold" : "text-[var(--text-primary)]")}>
                            ⚡ Gemini Flash
                          </button>
                          <button onClick={() => handleSelectApi('claude')} className={cn("w-full px-4 py-2.5 flex items-center gap-2 hover:bg-[var(--bg-hover)] text-left text-[14px]", selectedApi === 'claude' ? "text-[var(--accent)] font-bold" : "text-[var(--text-primary)]")}>
                            ✨ Claude Sonnet
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gemini Key */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[14px] font-bold text-[var(--text-primary)]">Gemini API Key</label>
                      {geminiTestStatus === 'success' && <span className="text-[12px] text-green-500 font-medium">연결 성공 ✅</span>}
                      {geminiTestStatus === 'error' && <span className="text-[12px] text-red-500 font-medium">실패 ❌</span>}
                    </div>
                    <div className="flex gap-2">
                      <input type="password" value={geminiKey} onChange={e => handleGeminiKeyChange(e.target.value)} placeholder="API 키 입력" className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" />
                      <button onClick={handleTestGemini} disabled={geminiTestStatus === 'loading'} className="px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[12px] font-bold hover:bg-[var(--bg-card)] transition-all disabled:opacity-50">
                        {geminiTestStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : '연결 테스트'}
                      </button>
                    </div>
                  </div>

                  {/* Claude Key */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[14px] font-bold text-[var(--text-primary)]">Claude API Key</label>
                      {claudeTestStatus === 'success' && <span className="text-[12px] text-green-500 font-medium">연결 성공 ✅</span>}
                      {claudeTestStatus === 'error' && <span className="text-[12px] text-red-500 font-medium">실패 ❌</span>}
                    </div>
                    <div className="flex gap-2">
                      <input type="password" value={claudeKey} onChange={e => handleClaudeKeyChange(e.target.value)} placeholder="API 키 입력" className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" />
                      <button onClick={handleTestClaude} disabled={claudeTestStatus === 'loading'} className="px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-[12px] font-bold hover:bg-[var(--bg-card)] transition-all disabled:opacity-50">
                        {claudeTestStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : '연결 테스트'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-sidebar)] flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 rounded-lg text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
              >
                닫기
              </button>
              {activeTab === 'prompt' && (
                <button
                  onClick={handleSavePrompt}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px] font-bold transition-all hover:brightness-110 active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  <span>설정 저장</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
