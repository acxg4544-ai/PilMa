'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { EditorRoot, EditorContent } from 'novel';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useLiveQuery } from 'dexie-react-hooks';
import CharacterCount from '@tiptap/extension-character-count';
import { InputRule } from '@tiptap/core';
import { useUiStore } from '@/store/uiStore';
import { useAiStore } from '@/store/aiStore';
import { useProjectStore } from '@/store/projectStore';
import { db } from '@/lib/db';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useAiSuggest } from '@/hooks/useAiSuggest';
import { ChevronDown, ChevronRight, SquareArrowOutUpRight, Monitor, Smartphone, Maximize, ZoomIn, ZoomOut, Search, Quote, Keyboard, Copy, Check, Pencil } from 'lucide-react';
import { PipWindow } from '@/components/ui/PipWindow';
import { SpellCheckPanel } from './SpellCheckPanel';
import { cn } from '@/lib/utils';

export default function NovelEditor() {
  const [initialContent, setInitialContent] = useState<any>(null);
  const [plot, setPlot] = useState('');
  const plotRef = useRef('');
  const [isPlotOpen, setIsPlotOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editorKey, setEditorKey] = useState(0);
  const editorRef = useRef<any>(null);
  
  const setWordCount = useUiStore((state) => state.setWordCount);
  const currentSceneId = useUiStore((state) => state.currentSceneId);
  const currentScene = useLiveQuery(
    () => (currentSceneId ? db.scenes.get(currentSceneId) : undefined),
    [currentSceneId]
  );
  
  const setCurrentProject = useUiStore((state) => state.setCurrentProject);
  const setCurrentScene = useUiStore((state) => state.setCurrentScene);

  const editorPipMode = useUiStore((state) => state.editorPipMode);
  const setEditorPipMode = useUiStore((state) => state.setEditorPipMode);
  const editorPipPosition = useUiStore((state) => state.editorPipPosition);
  const setEditorPipPosition = useUiStore((state) => state.setEditorPipPosition);
  const editorPreset = useUiStore((state) => state.editorPreset);
  const setEditorPreset = useUiStore((state) => state.setEditorPreset);
  const zoomLevel = useUiStore((state) => state.zoomLevel);
  const setZoomLevel = useUiStore((state) => state.setZoomLevel);
  const smartQuotes = useUiStore((state) => state.smartQuotes);
  const setSmartQuotes = useUiStore((state) => state.setSmartQuotes);
  const typewriterMode = useUiStore((state) => state.typewriterMode);
  const setTypewriterMode = useUiStore((state) => state.setTypewriterMode);
  
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const presetRef = useRef<HTMLDivElement>(null);

  // 맞춤법 검사 상태
  const [isSpellCheckOpen, setIsSpellCheckOpen] = useState(false);
  const [isSpellChecking, setIsSpellChecking] = useState(false);
  const [spellCheckResults, setSpellCheckResults] = useState<any[]>([]);
  const [replacedIndices, setReplacedIndices] = useState<Set<number>>(new Set());

  const presets = [
    { id: 'default', name: '기본', icon: <Monitor size={14} />, description: '760px / 18px / 2.0', styles: { maxWidth: '760px', fontSize: '18px', lineHeight: '2.0', padding: '60px 48px' } },
    { id: 'munpia', name: '문피아', icon: <Smartphone size={14} />, description: '360px / 16px / 1.8', styles: { maxWidth: '360px', fontSize: '16px', lineHeight: '1.8', padding: '16px 20px' } },
    { id: 'kakaopage', name: '카카페', icon: <Smartphone size={14} />, description: '380px / 15.5px / 1.9', styles: { maxWidth: '380px', fontSize: '15.5px', lineHeight: '1.9', padding: '16px 18px' } },
    { id: 'novelpia', name: '노벨피아', icon: <Smartphone size={14} />, description: '370px / 16px / 1.85', styles: { maxWidth: '370px', fontSize: '16px', lineHeight: '1.85', padding: '16px 20px' } },
    { id: 'wide', name: '넓게', icon: <Maximize size={14} />, description: '100% / 18px / 2.0', styles: { maxWidth: '100%', fontSize: '18px', lineHeight: '2.0', padding: '60px 48px' } },
  ];

  const currentPreset = presets.find(p => p.id === editorPreset) || presets[0];
  const isMobileView = ['munpia', 'kakaopage', 'novelpia'].includes(editorPreset);

  // PIP 모드에서는 transform: scale 대신 font-size를 키우는 계산식 사용
  const pipFontSize = React.useMemo(() => {
    if (!editorPipMode) return null;
    const baseSize = parseFloat(currentPreset.styles.fontSize);
    return `${baseSize * (zoomLevel / 100)}px`;
  }, [editorPipMode, currentPreset.styles.fontSize, zoomLevel]);

  const pipLineHeight = React.useMemo(() => {
    if (!editorPipMode) return null;
    const baseLH = parseFloat(currentPreset.styles.lineHeight);
    // line-height는 비율이므로 그대로 유지해도 되지만, 가독성을 위해 font-size와 함께 체크
    return currentPreset.styles.lineHeight;
  }, [editorPipMode, currentPreset.styles.lineHeight]);

  // 단축키 리스너 (줌 조절: Ctrl+ +, -, 0)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setZoomLevel(zoomLevel + 10);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoomLevel(zoomLevel - 10);
      } else if (e.key === '0') {
        e.preventDefault();
        setZoomLevel(100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomLevel, setZoomLevel]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setIsPresetOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { lastInsertionRequest, clearInsertRequest, promptPresets, activeCacheSummary, activeCacheUri } = useAiStore();
  const { triggerAutoSave } = useAutoSave();
  const { fetchSuggestions } = useAiSuggest();

  // AI 삽입 요청 처리
  useEffect(() => {
    if (lastInsertionRequest && editorRef.current) {
      editorRef.current.commands.insertContent(lastInsertionRequest);
      clearInsertRequest();
    }
  }, [lastInsertionRequest, clearInsertRequest]);

  // (프로젝트 초기화 로직은 project/[id]/page.tsx 로 이동되어 제거됨)

  // 씬 콘텐츠 로드
  useEffect(() => {
    async function loadScene() {
      if (!currentSceneId) return;
      setIsLoading(true);
      try {
        const scene = await db.scenes.get(currentSceneId);
        if (scene) {
          setInitialContent(scene.content || { type: 'doc', content: [{ type: 'paragraph' }] });
          const initialPlot = scene.plot || '';
          setPlot(initialPlot);
          plotRef.current = initialPlot;
          setWordCount(scene.wordCount || 0);
          setEditorKey(prev => prev + 1);
        }
      } catch (err) {
        console.error('Failed to load scene:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadScene();
  }, [currentSceneId, setWordCount]);



  // PIP 모드에서 플랫폼 변경 시 창 크기 자동 조절
  useEffect(() => {
    if (editorPipMode && isMobileView) {
      const platformWidth = parseInt(currentPreset.styles.maxWidth);
      const newWidth = platformWidth + 80; // 패딩 및 여유 공간 포함
      if (editorPipPosition.w !== newWidth) {
        setEditorPipPosition({
          ...editorPipPosition,
          w: newWidth
        });
      }
    }
  }, [editorPreset, editorPipMode, isMobileView, currentPreset.styles.maxWidth, editorPipPosition, setEditorPipPosition]);

  // Ctrl + Space, Ctrl + 1~5 리스너
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      
      let isAiTrigger = false;
      let slot = 0;

      if (e.code === 'Space') {
        isAiTrigger = true;
      } else if (e.key >= '1' && e.key <= '5') {
        isAiTrigger = true;
        slot = parseInt(e.key, 10);
      }

      if (isAiTrigger) {
        e.preventDefault();
        if (editorRef.current) {
          const { state } = editorRef.current;
          const { from, to } = state.selection;
          
          // 커서 앞 2000자
          const contextStart = Math.max(0, from - 2000);
          const context = state.doc.textBetween(contextStart, from, "\n");
          
          // 블록 선택된 텍스트
          const selectedText = from !== to ? state.doc.textBetween(Math.min(from, to), Math.max(from, to), "\n") : "";
          
          // 커스텀 프롬프트
          const customPrompt = slot > 0 ? promptPresets[slot] : "";

          if (context.trim().length > 0 || selectedText.trim().length > 0) {
            fetchSuggestions(context, plot, selectedText, customPrompt, activeCacheUri || '');
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [fetchSuggestions, plot, promptPresets, activeCacheUri]);

  const handlePlotChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPlot = e.target.value;
    setPlot(newPlot);
    plotRef.current = newPlot;
    if (editorRef.current) {
      const text = editorRef.current.getText();
      const content = editorRef.current.getJSON();
      const count = text.replace(/\s+/g, '').length;
      triggerAutoSave(content, count, newPlot);
    }
  };

  const handleUpdate = useCallback((editor: any) => {
    if (!editor) return;
    editorRef.current = editor;
    const text = editor.getText();
    const content = editor.getJSON();
    const count = text.replace(/\s+/g, '').length;
    setWordCount(count);
    triggerAutoSave(content, count, plotRef.current);
  }, [setWordCount, triggerAutoSave]);

  const handleSelectionUpdate = useCallback(({ editor }: { editor: any }) => {
    if (typewriterMode) {
      const { view } = editor;
      const { state } = view;
      const { selection } = state;
      
      // 커서 위치의 DOM 요소 찾기
      const node = view.domAtPos(selection.from).node;
      const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
      
      if (element) {
        element.scrollIntoView({
          block: 'center',
          behavior: 'smooth'
        });
      }
    }
  }, [typewriterMode]);

  // 맞춤법 검사 실행
  const handleSpellCheck = async () => {
    if (!editorRef.current || isSpellChecking) return;
    
    setIsSpellChecking(true);
    setIsSpellCheckOpen(true);
    setSpellCheckResults([]);
    setReplacedIndices(new Set());

    const text = editorRef.current.getText();
    
    try {
      const response = await fetch('/api/ai/spellcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setSpellCheckResults(data.results || []);
    } catch (err) {
      console.error('Spellcheck error:', err);
    } finally {
      setIsSpellChecking(false);
    }
  };

  // 텍스트 자동 교체
  const handleReplace = (original: string, suggestion: string, index: number) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const { state } = editor;
    const { doc } = state;
    
    let found = false;
    doc.descendants((node: any, pos: number) => {
      if (found) return false;
      if (node.isText && node.text?.includes(original)) {
        const start = pos + node.text.indexOf(original);
        editor.commands.insertContentAt({ from: start, to: start + original.length }, suggestion);
        found = true;
        setReplacedIndices(prev => new Set(prev).add(index));
      }
      return true;
    });
  };

  const handleCopyText = useCallback(() => {
    if (!editorRef.current) return;
    
    // 순수 텍스트 추출 (Paragraph 사이에 \n 삽입)
    const plainText = editorRef.current.getText({ blockSeparator: '\n' });
    
    navigator.clipboard.writeText(plainText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  }, []);

  const customSmartQuotes = React.useMemo(() => {
    if (!smartQuotes) return [];

    return [
      // 큰따옴표: 앞이 공백/시작이면 “, 글자 뒤면 ”
      new InputRule({
        find: /(?:^|\s)"$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          tr.insertText('“', start, end);
        },
      }),
      new InputRule({
        find: /\S"$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          tr.insertText('”', start, end);
        },
      }),
      // 작은따옴표: 앞이 공백/시작이면 ‘, 글자 뒤면 ’
      new InputRule({
        find: /(?:^|\s)'$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          tr.insertText('‘', start, end);
        },
      }),
      new InputRule({
        find: /\S'$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          tr.insertText('’', start, end);
        },
      }),
    ];
  }, [smartQuotes]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center">
        <div 
          className="w-full bg-[var(--bg-editor)] border border-[var(--border)] rounded-xl mx-auto min-h-[80vh] p-12 flex flex-col gap-6 animate-pulse"
          style={{ maxWidth: currentPreset.styles.maxWidth }}
        >
          <div className="h-8 bg-[var(--bg-hover)] rounded w-1/3 mb-4 opacity-40" />
          <div className="space-y-4">
            <div className="h-4 bg-[var(--bg-hover)] rounded w-full opacity-30" />
            <div className="h-4 bg-[var(--bg-hover)] rounded w-full opacity-30" />
            <div className="h-4 bg-[var(--bg-hover)] rounded w-5/6 opacity-30" />
            <div className="h-4 bg-[var(--bg-hover)] rounded w-full opacity-30" />
            <div className="h-4 bg-[var(--bg-hover)] rounded w-4/5 opacity-30" />
            <div className="h-4 bg-[var(--bg-hover)] rounded w-full opacity-30" />
            <div className="h-4 bg-[var(--bg-hover)] rounded w-2/3 opacity-30" />
          </div>
        </div>
      </div>
    );
  }

  const controlsBar = (
    <div className={cn(
      "flex items-center justify-end gap-1.5 z-30 px-2 py-1 shrink-0 bg-transparent",
      editorPipMode && "w-full sticky top-0 bg-[var(--bg-card)]/80 backdrop-blur-md border-b border-[var(--border)] mb-0"
    )}>
      {/* 에디터 옵션 - 단일 버튼들 */}
      <button
        onClick={() => setSmartQuotes(!smartQuotes)}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-md transition-all",
          smartQuotes ? "text-[var(--accent)]" : "text-[var(--text-disabled)] hover:text-[var(--text-primary)]"
        )}
        title={`스마트 따옴표: ${smartQuotes ? 'ON' : 'OFF'}`}
      >
        <Quote size={20} />
      </button>
      <button
        onClick={() => setTypewriterMode(!typewriterMode)}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-md transition-all",
          typewriterMode ? "text-[var(--accent)]" : "text-[var(--text-disabled)] hover:text-[var(--text-primary)]"
        )}
        title={`타입라이터 모드: ${typewriterMode ? 'ON' : 'OFF'}`}
      >
        <Keyboard size={20} />
      </button>
      <button
        onClick={handleSpellCheck}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-md transition-all",
          isSpellCheckOpen ? "text-[var(--accent)]" : "text-[var(--text-disabled)] hover:text-[var(--text-primary)]"
        )}
        title="맞춤법 검사 실행"
      >
        <Pencil size={20} />
      </button>

      <div className="w-px h-4 border-l border-[var(--border)] opacity-30 mx-1" />

      {/* 줌 컨트롤 */}
      <div className="flex items-center">
        <button 
          onClick={() => setZoomLevel(zoomLevel - 10)}
          className="w-8 h-8 flex items-center justify-center text-[var(--text-disabled)] hover:text-[var(--text-primary)] transition-colors"
          title="축소 (Ctrl + -)"
        >
          <ZoomOut size={20} />
        </button>
        <button 
          onClick={() => setZoomLevel(100)}
          className="px-1 text-[12px] font-bold text-[var(--text-disabled)] hover:text-[var(--accent)] min-w-[35px] text-center"
          title="100% 리셋 (Ctrl + 0)"
        >
          {zoomLevel}%
        </button>
        <button 
          onClick={() => setZoomLevel(zoomLevel + 10)}
          className="w-8 h-8 flex items-center justify-center text-[var(--text-disabled)] hover:text-[var(--text-primary)] transition-colors"
          title="확대 (Ctrl + =)"
        >
          <ZoomIn size={20} />
        </button>
      </div>

      <div className="w-px h-4 border-l border-[var(--border)] opacity-30 mx-1" />

      {/* 프리셋 드롭다운 (텍스트 버튼형) */}
      <div className="relative" ref={presetRef}>
        <button
          onClick={() => setIsPresetOpen(!isPresetOpen)}
          className="flex items-center gap-0.5 px-2 py-1.5 text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
        >
          <span>{currentPreset.name}</span>
          <ChevronDown size={14} className={cn("transition-transform duration-200 opacity-60", isPresetOpen && "rotate-180")} />
        </button>

        {isPresetOpen && (
          <div className="absolute top-full mt-1 right-0 w-44 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl py-1 z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setEditorPreset(p.id);
                  setIsPresetOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors text-left",
                  editorPreset === p.id ? "text-[var(--accent)] bg-[var(--accent)]/5" : "text-[var(--text-secondary)]"
                )}
              >
                <span className="text-[13px] font-bold">{p.name}</span>
                {editorPreset === p.id && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-4 border-l border-[var(--border)] opacity-30 mx-1" />

      {/* PIP & 복사 */}
      {!editorPipMode && (
        <button
          onClick={() => setEditorPipMode(true)}
          className="w-8 h-8 flex items-center justify-center text-[var(--text-disabled)] hover:text-[var(--text-primary)] transition-all"
          title="플로팅(PIP) 모드로 분리"
        >
          <SquareArrowOutUpRight size={20} />
        </button>
      )}
      <button
        onClick={handleCopyText}
        className={cn(
          "w-8 h-8 flex items-center justify-center transition-all",
          isCopied ? "text-[var(--accent)]" : "text-[var(--text-disabled)] hover:text-[var(--text-primary)]"
        )}
        title="본문 복사 (순수 텍스트)"
      >
        {isCopied ? <Check size={20} /> : <Copy size={20} />}
      </button>
    </div>
  );

  const editorBody = (
    <div className="flex flex-col w-full h-full items-center">
      {/* 줌 영향 안 받는 상단 레이어 */}
      {!editorPipMode && (
        <div className="w-full max-w-[760px] z-30">
          {controlsBar}
        </div>
      )}

      {/* 2. 에디터 본체 (여기에만 줌 적용) */}
      <div 
        className={cn(
          "w-full bg-[var(--bg-editor)] border border-[var(--border)] rounded-xl mx-auto relative overflow-visible flex flex-col transition-all duration-500 ease-in-out", 
          editorPipMode ? "min-h-full flex-1" : "min-h-[85vh] shadow-[0_4px_20px_rgba(0,0,0,0.08)]",
          isMobileView && "rounded-[24px] border-2 border-[var(--border)] shadow-2xl" // PIP 여부 상관없이 모바일뷰면 프레임 적용
        )} 
        style={{ 
          maxWidth: currentPreset.styles.maxWidth, // PIP든 메인이든 프리셋 폭 유지
          fontSize: editorPipMode ? pipFontSize! : currentPreset.styles.fontSize,
          lineHeight: editorPipMode ? pipLineHeight! : currentPreset.styles.lineHeight,
          transform: editorPipMode ? 'none' : `scale(${zoomLevel / 100})`, // 메인만 scale 사용
          transformOrigin: 'top center',
          flexGrow: 0,
          flexShrink: 0,
        }}
      >
        {/* 모바일 폰 상단 장식 (노치) */}
        {isMobileView && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[40%] h-1 bg-[var(--border)] rounded-full z-20" />
        )}

        {/* 상단 장식 바 (기본/넓게 모드 전용) */}
        {!isMobileView && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--accent)] rounded-t-xl" />
        )}

        {/* 실제 에디팅 영역 (패딩 포함) */}
        <div 
           className="flex-1 flex flex-col"
           style={{ padding: currentPreset.styles.padding }} // PIP에서도 프리셋 패딩 유지
        >
          {/* 회차 플롯 영역 (패딩 내부) */}
          <div className="mb-4">
            <button 
              onClick={() => setIsPlotOpen(!isPlotOpen)}
              className="flex items-center border-b border-transparent hover:border-[var(--divider)] gap-1.5 text-[14px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all py-1 w-full text-left"
            >
              <ChevronRight size={16} className={cn("transition-transform duration-200", isPlotOpen && "rotate-90")} />
              <span>📋 이번 회차 플롯 ({currentScene?.title || "제목 없음"})</span>
            </button>
            {isPlotOpen && (
              <textarea
                value={plot}
                onChange={handlePlotChange}
                placeholder="예시: 주인공이 조카의 담임을 만남 → 담임이 호감을 보임 → 주인공 당황&#13;&#10;(플롯을 추가하세요...)"
                className="mt-2 w-full min-h-[80px] max-h-[150px] bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg p-3 text-[14px] text-[var(--text-primary)] font-pretendard animate-in fade-in slide-in-from-top-1 duration-200 resize-y focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            )}
            {!isPlotOpen && <div className="mt-2 h-px bg-[var(--divider)] opacity-50 w-full" />}
          </div>

          <div className="flex-1 min-h-0">
            <EditorRoot>
              <EditorContent
                key={editorKey}
                initialContent={initialContent}
                extensions={[
                  StarterKit,
                  Placeholder.configure({
                    placeholder: "이야기를 시작하세요....",
                    emptyEditorClass: "is-editor-empty",
                  }),
                  CharacterCount,
                  // 스마트 따옴표 InputRule 직접 추가
                  {
                    name: 'customSmartQuotes',
                    addInputRules() {
                      return customSmartQuotes;
                    },
                  } as any,
                ].filter(Boolean) as any}
                onUpdate={({ editor }) => handleUpdate(editor)}
                onSelectionUpdate={handleSelectionUpdate}
                onCreate={({ editor }) => { editorRef.current = editor; }}
                className="novel-editor-wrapper prose-lg focus:outline-none"
              />
              <style jsx global>{`
                .is-editor-empty:before {
                  content: attr(data-placeholder);
                  float: left;
                  color: var(--text-disabled);
                  pointer-events: none;
                  height: 0;
                  font-style: italic;
                  font-size: 18px;
                }
                .novel-editor-wrapper .ProseMirror {
                   min-height: 200px;
                   outline: none !important;
                }
              `}</style>
            </EditorRoot>
          </div>

          {/* 맞춤법 검사 패널 */}
          {isSpellCheckOpen && (
            <SpellCheckPanel
              results={spellCheckResults}
              isLoading={isSpellChecking}
              onClose={() => setIsSpellCheckOpen(false)}
              onReplace={handleReplace}
              replacedIndices={replacedIndices}
            />
          )}
        </div>
      </div>
    </div>
  );

  if (editorPipMode) {
    return (
      <div className="w-full h-full flex items-center justify-center px-4 overflow-hidden">
        {/* 메인 영역 플레이스홀더 */}
        <div className="w-full max-w-[500px] min-h-[30vh] bg-[var(--bg-editor)]/40 border border-dashed border-[var(--border)] rounded-xl my-6 flex flex-col items-center justify-center p-8 text-center text-[var(--text-secondary)]">
            <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">✨ 에디터가 PIP 모드로 전환되었습니다.</h3>
            <p className="text-xs opacity-70 mb-5">화면 위에 떠 있는 플로팅 창에서 작업을 계속할 수 있습니다.</p>
            <button onClick={() => setEditorPipMode(false)} className="px-4 py-2 bg-[var(--bg-hover)] hover:bg-[var(--border)] text-[var(--text-primary)] rounded-md text-xs font-medium transition-colors border border-[var(--divider)] shadow-sm">
              원래 자리로 돌려놓기
            </button>
        </div>

        {/* PIP 플로팅 에디터 */}
        <PipWindow
          title={<span className="font-semibold text-[14px]">에디터 ✨</span>}
          position={editorPipPosition}
          onPositionChange={setEditorPipPosition}
          onRestore={() => setEditorPipMode(false)}
          onClose={() => setEditorPipMode(false)}
          minWidth={isMobileView ? 400 : 500} // 최소 너비 약간 상향 (잘림 방지)
          minHeight={400}
          controls={controlsBar}
        >
          <div className="w-full h-full overflow-auto bg-[var(--bg-bg)] relative flex items-start justify-center p-4">
            {editorBody}
          </div>
        </PipWindow>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto flex flex-col items-center custom-scrollbar">
      <div className="w-full shrink-0">
        {editorBody}
      </div>
    </div>
  );
}
