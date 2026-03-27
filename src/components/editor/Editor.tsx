'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { EditorRoot, EditorContent } from 'novel';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useLiveQuery } from 'dexie-react-hooks';
import CharacterCount from '@tiptap/extension-character-count';
import { InputRule, Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useUiStore } from '@/store/uiStore';
import { useAiStore } from '@/store/aiStore';
import { useProjectStore } from '@/store/projectStore';
import { db } from '@/lib/db';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useAiSuggest } from '@/hooks/useAiSuggest';
import { PipWindow } from '@/components/ui/PipWindow';
import { SpellCheckPanel } from './SpellCheckPanel';
import { HistoryPanel } from './HistoryPanel';
import { FindReplacePanel } from './FindReplacePanel';
import { cn } from '@/lib/utils';
import { Clock, ChevronDown, ChevronRight, SquareArrowOutUpRight, Monitor, Smartphone, Maximize, ZoomIn, ZoomOut, Search, Quote, Keyboard, Copy, Check, Pencil, Bot } from 'lucide-react';

export default function NovelEditor() {
  const [initialContent, setInitialContent] = useState<any>(null);
  const [plot, setPlot] = useState('');
  const plotRef = useRef('');
  const [isPlotOpen, setIsPlotOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editorKey, setEditorKey] = useState(0);
  const editorRef = useRef<any>(null);
  
  const setWordCount = useUiStore((state) => state.setWordCount);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
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
  const searchTermStore = useUiStore((state) => state.searchTerm);
  const setSearchTermStore = useUiStore((state) => state.setSearchTerm);
  
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const presetRef = useRef<HTMLDivElement>(null);
  const prevZoomRef = useRef(zoomLevel);
  const isSyncingSizeRef = useRef(false);
  
  // 글자수 업데이트 최적화를 위한 ref
  const lastCharCountRef = useRef(0);
  const charCountTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 씬 전환 최적화 상태
  const isTransitioningRef = useRef(false);
  const lastSceneIdRef = useRef<string | null>(null);
  
  // 맞춤법 검사 부가 상태
  const [fixedValues, setFixedValues] = useState<Record<number, string>>({});
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [addedToDictIndices, setAddedToDictIndices] = useState<Set<number>>(new Set());

  // 텍스트 대치 및 단어장 상태 추가
  const replacements = useLiveQuery(
    () => (currentProjectId ? db.text_replacements.where('projectId').equals(currentProjectId).toArray() : []),
    [currentProjectId]
  ) || [];

  const [replaceEnabled, setReplaceEnabled] = useState(true);
  
  useEffect(() => {
    const checkReplaceEnabled = () => {
      const val = localStorage.getItem('pilma_replace_enabled');
      setReplaceEnabled(val !== 'false');
    };
    checkReplaceEnabled();
    window.addEventListener('storage', checkReplaceEnabled);
    return () => window.removeEventListener('storage', checkReplaceEnabled);
  }, []);

  // 맞춤법 검사 상태
  const [isSpellCheckOpen, setIsSpellCheckOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSpellChecking, setIsSpellChecking] = useState(false);
  const [spellCheckResults, setSpellCheckResults] = useState<any[]>([]);
  const [replacedIndices, setReplacedIndices] = useState<Set<number>>(new Set());

  // 찾아 바꾸기 상태
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [findReplaceMode, setFindReplaceMode] = useState<'find' | 'replace'>('find');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findMatches, setFindMatches] = useState<{ from: number, to: number }[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // 찾아 바꾸기 하이라이트 확장
  const findHighlightExtension = React.useMemo(() => {
    return Extension.create({
      name: 'findHighlight',
      addProseMirrorPlugins() {
        return [
          new Plugin({
            key: new PluginKey('findHighlight'),
            props: {
              decorations: (state) => {
                if (!findText || findMatches.length === 0) return null;
                const decorations: Decoration[] = [];
                const docSize = state.doc.content.size;

                findMatches.forEach((match, idx) => {
                  // 문서 크기가 변했을 수 있으므로 유효성 체크
                  if (match.from >= 0 && match.to <= docSize && match.from < match.to) {
                    decorations.push(
                      Decoration.inline(match.from, match.to, {
                        class: idx === currentMatchIndex ? 'find-highlight-current' : 'find-highlight'
                      })
                    );
                  }
                });
                return decorations.length > 0 ? DecorationSet.create(state.doc, decorations) : null;
              }
            }
          })
        ];
      }
    });
  }, [findText, findMatches, currentMatchIndex]);

  // 맞춤법 하이라이트 확장을 위한 Decoration
  const spellCheckHighlightExtension = React.useMemo(() => {
    return Extension.create({
      name: 'spellCheckHighlight',
      addProseMirrorPlugins() {
        return [
          new Plugin({
            key: new PluginKey('spellCheckHighlight'),
            props: {
              decorations: (state) => {
                if (highlightedIndex === null) return null;
                const error = spellCheckResults[highlightedIndex];
                if (!error || replacedIndices.has(highlightedIndex) || addedToDictIndices.has(highlightedIndex)) return null;
                
                const decorations: Decoration[] = [];
                const textToFind = error.original;
                const docSize = state.doc.content.size;
                
                state.doc.descendants((node, pos) => {
                  if (node.isText && node.text?.includes(textToFind)) {
                    const localStart = node.text.indexOf(textToFind);
                    const start = pos + localStart;
                    const end = start + textToFind.length;
                    
                    if (start >= 0 && end <= docSize) {
                      decorations.push(
                        Decoration.inline(start, end, {
                          class: 'spellcheck-highlight'
                        })
                      );
                    }
                  }
                });
                return decorations.length > 0 ? DecorationSet.create(state.doc, decorations) : null;
              }
            }
          })
        ];
      }
    });
  }, [highlightedIndex, spellCheckResults, replacedIndices, addedToDictIndices]);

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

  // 찾아 바꾸기 단축키 및 검색 로직
  const findMatchesInDoc = useCallback((text: string) => {
    if (!editorRef.current || !text) {
      setFindMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }
    const { doc } = editorRef.current.state;
    const matches: { from: number, to: number }[] = [];
    doc.descendants((node: any, pos: number) => {
      if (node.isText) {
        const content = node.text!;
        let startPos = 0;
        while ((startPos = content.indexOf(text, startPos)) !== -1) {
          matches.push({ from: pos + startPos, to: pos + startPos + text.length });
          startPos += text.length;
        }
      }
    });
    setFindMatches(matches);
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      // 첫 번째 결과로 이동
      const { view } = editorRef.current;
      const tr = view.state.tr.setSelection(
        TextSelection.create(view.state.doc, matches[0].from)
      );
      view.dispatch(tr.scrollIntoView());
    } else {
      setCurrentMatchIndex(-1);
    }
  }, []);

  const handleNextMatch = useCallback(() => {
    if (findMatches.length === 0 || !editorRef.current) return;
    const nextIdx = (currentMatchIndex + 1) % findMatches.length;
    setCurrentMatchIndex(nextIdx);
    const match = findMatches[nextIdx];
    const { view } = editorRef.current;
    const tr = view.state.tr.setSelection(
      TextSelection.create(view.state.doc, match.from)
    );
    view.dispatch(tr.scrollIntoView());
  }, [findMatches, currentMatchIndex]);

  const handlePrevMatch = useCallback(() => {
    if (findMatches.length === 0 || !editorRef.current) return;
    const prevIdx = (currentMatchIndex - 1 + findMatches.length) % findMatches.length;
    setCurrentMatchIndex(prevIdx);
    const match = findMatches[prevIdx];
    const { view } = editorRef.current;
    const tr = view.state.tr.setSelection(
      TextSelection.create(view.state.doc, match.from)
    );
    view.dispatch(tr.scrollIntoView());
  }, [findMatches, currentMatchIndex]);

  const executeReplaceMatch = useCallback((replacement: string) => {
    if (currentMatchIndex === -1 || findMatches.length === 0 || !editorRef.current) return;
    const match = findMatches[currentMatchIndex];
    editorRef.current.commands.insertContentAt({ from: match.from, to: match.to }, replacement);
    // 재검색
    setTimeout(() => findMatchesInDoc(findText), 10);
  }, [currentMatchIndex, findMatches, findText, findMatchesInDoc]);

  const handleReplaceAll = useCallback((target: string, replacement: string) => {
    if (!editorRef.current || !target) return;
    const editor = editorRef.current;
    let content = editor.getText();
    if (!content.includes(target)) return;
    
    // 단순 텍스트 교체가 아닌 에디터 명령어로 실행 (히스토리 보존)
    let offset = 0;
    const matches: { from: number, to: number }[] = [];
    editor.state.doc.descendants((node: any, pos: number) => {
        if (node.isText) {
            const text = node.text!;
            let s = 0;
            while ((s = text.indexOf(target, s)) !== -1) {
                matches.push({ from: pos + s, to: pos + s + target.length });
                s += target.length;
            }
        }
    });

    // 뒤에서부터 순차적으로 교체해야 포지션 안 꼬임
    for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        editor.commands.insertContentAt({ from: m.from, to: m.to }, replacement);
    }
    
    setTimeout(() => findMatchesInDoc(findText), 50);
  }, [findText, findMatchesInDoc]);

  useEffect(() => {
    const handleFindKeys = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setFindReplaceMode('find');
        setIsFindReplaceOpen(true);
      } else if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setFindReplaceMode('replace');
        setIsFindReplaceOpen(true);
      }
    };
    window.addEventListener('keydown', handleFindKeys);
    return () => window.removeEventListener('keydown', handleFindKeys);
  }, []);

  // 외부(바인더 검색)로부터 온 검색어 처리
  useEffect(() => {
    if (searchTermStore && editorRef.current && !isLoading) {
      setFindText(searchTermStore);
      setFindReplaceMode('find');
      setIsFindReplaceOpen(true);
      // 검색 실행
      setTimeout(() => {
        findMatchesInDoc(searchTermStore);
        // 처리 후 소모됨 처리 (무한 루프 방지)
        setSearchTermStore('');
      }, 500);
    }
  }, [searchTermStore, isLoading, findMatchesInDoc, setSearchTermStore]);

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

  const { lastInsertionRequest, clearInsertRequest, promptPresets, activeCacheSummary, activeCacheUri, isAiPanelOpen, setAiPanelOpen } = useAiStore();
  const { triggerAutoSave } = useAutoSave();
  const { fetchSuggestions } = useAiSuggest();

  // AI 삽입 요청 처리
  useEffect(() => {
    if (lastInsertionRequest && editorRef.current) {
      editorRef.current.commands.insertContent(lastInsertionRequest);
      clearInsertRequest();
    }
  }, [lastInsertionRequest, clearInsertRequest]);

  // PIP 전환 시 유실 방지 핸들러
  const toggleEditorPip = async (isPip: boolean) => {
    if (editorRef.current && currentSceneId) {
      const content = editorRef.current.getJSON();
      const text = editorRef.current.getText();
      
      // 내용 유실 차단: 빈 본문이 아니면 저장
      if (text.trim().length > 0) {
        setInitialContent(content); // 리마운트용 초기값 즉시 갱신
        await db.scenes.update(currentSceneId, {
          content,
          wordCount: text.length,
          updatedAt: Date.now()
        });
      }
    }
    setEditorPipMode(isPip);
    setEditorKey(prev => prev + 1); // 에디터 인스턴스 재생성 유도
  };

  // (프로젝트 초기화 로직은 project/[id]/page.tsx 로 이동되어 제거됨)

  // 씬 콘텐츠 로드
  useEffect(() => {
    async function loadScene() {
      if (!currentSceneId) return;

      // 1. 이전 씬 비동기 저장 시도 (await 안 기다리고 백그라운드)
      if (editorRef.current && lastSceneIdRef.current && lastSceneIdRef.current !== currentSceneId) {
        const oldId = lastSceneIdRef.current;
        const oldContent = editorRef.current.getJSON();
        const oldText = editorRef.current.getText();
        const oldPlot = plotRef.current;
        
        // 백그라운드 업데이트 (UI 블로킹 방지)
        db.scenes.update(oldId, {
          content: oldContent,
          wordCount: oldText.replace(/\r?\n/g, '').length,
          plot: oldPlot,
          updatedAt: Date.now()
        }).catch(err => console.error('Background save failed:', err));
      }

      lastSceneIdRef.current = currentSceneId;
      isTransitioningRef.current = true;
      setIsLoading(true);

      try {
        const scene = await db.scenes.get(currentSceneId);
        if (scene) {
          // 2. 2단계 로딩: 먼저 빈 content 세팅하여 에디터 DOM 리셋 부하 분산
          setInitialContent({ type: 'doc', content: [{ type: 'paragraph' }] });
          
          requestAnimationFrame(() => {
            // 3. 실제 content 세팅 (레이아웃 스래싱 방지)
            setInitialContent(scene.content || { type: 'doc', content: [{ type: 'paragraph' }] });
            const initialPlot = scene.plot || '';
            setPlot(initialPlot);
            plotRef.current = initialPlot;
            
            // 글자수는 DB 데이터를 즉시 반영하여 UI 끊김 방지
            setWordCount(scene.wordCount || 0);
            lastCharCountRef.current = scene.wordCount || 0;
            
            setEditorKey(prev => prev + 1);
            
            // 4. 나머지 무거운 작업들(AI 캐시, 글자수 정밀 재계산 등)은 500ms 뒤에 실행
            setTimeout(() => {
              isTransitioningRef.current = false;
              setIsLoading(false);
            }, 500);
          });
        }
      } catch (err) {
        console.error('Failed to load scene:', err);
        setIsLoading(false);
        isTransitioningRef.current = false;
      }
    }
    loadScene();
  }, [currentSceneId, setWordCount]);

  // 5초마다 글자수 강제 재계산 (정확도 보정)
  useEffect(() => {
    const interval = setInterval(() => {
      // 씬 전환 중에는 실행 금지
      if (editorRef.current && !isTransitioningRef.current) {
        const text = editorRef.current.getText();
        // 줄바꿈 제외 카운트 (문피아 기준)
        const count = text.replace(/\r?\n/g, '').length;
        if (count !== lastCharCountRef.current) {
          setWordCount(count);
          lastCharCountRef.current = count;
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [setWordCount]);



  // PIP 모드에서 플랫폼 변경 시 창 크기 자동 조절
  useEffect(() => {
    if (editorPipMode && isMobileView) {
      const platformWidth = parseInt(currentPreset.styles.maxWidth);
      const zoomFactor = zoomLevel / 100;
      const newWidth = Math.round((platformWidth + 80) * zoomFactor); 
      
      if (Math.abs(editorPipPosition.w - newWidth) > 1) {
        setEditorPipPosition({
          ...editorPipPosition,
          w: newWidth
        });
      }
    }
  }, [editorPreset, editorPipMode, isMobileView, currentPreset.styles.maxWidth, zoomLevel]);

  // 줌 레벨 변경 시 PIP 창 크기 동적으로 조절 (실시간 연동)
  useEffect(() => {
    if (editorPipMode && prevZoomRef.current !== zoomLevel && !isSyncingSizeRef.current) {
      const factor = zoomLevel / prevZoomRef.current;
      
      isSyncingSizeRef.current = true;
      setEditorPipPosition({
        ...editorPipPosition,
        w: Math.max(isMobileView ? 400 : 500, Math.round(editorPipPosition.w * factor)),
        h: Math.round(editorPipPosition.h * factor),
      });
      
      // 상태 업데이트 반영 대기
      setTimeout(() => {
        isSyncingSizeRef.current = false;
      }, 50);
    }
    prevZoomRef.current = zoomLevel;
  }, [zoomLevel, editorPipMode, isMobileView, editorPipPosition.w, editorPipPosition.h, setEditorPipPosition]);

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
      const editor = editorRef.current;
      const text = editor.getText(); 
      const count = text.replace(/\r?\n/g, '').length;
      const content = editor.getJSON();
      triggerAutoSave(content, count, newPlot);
    }
  };

  const handleUpdate = useCallback((editor: any) => {
    // 씬 전환 중이거나 에디터가 없으면 업데이트 무시
    if (!editor || editor.isDestroyed || isTransitioningRef.current) return;
    editorRef.current = editor;
    
    // 무거운 작업 금지 및 글자수 업데이트 최적화 (300ms debounce)
    const state = editor.state;
    const content = editor.getJSON();
    const text = editor.getText();
    const docSize = state.doc.content.size;
    
    // 텍스트 대치 (자동 치환) 로직 통합
    if (replaceEnabled && replacements.length > 0) {
      const { selection } = state;
      const { $from, empty } = selection;
      
      // 커서 바로 앞의 텍스트가 공백/줄바꿈으로 끝난다면 (스페이스/엔터 입력된 상태)
      if (empty && $from.pos > 0) {
        // 현재 블록(패러그래프)에서의 텍스트 추출 (최대 30자)
        const textInBlock = $from.parent.textBetween(Math.max(0, $from.parentOffset - 30), $from.parentOffset, undefined, ' ');

        // 사이드 이펙트 방지를 위해 rAF로 감쌈
        requestAnimationFrame(() => {
          if (editor.isDestroyed) return;

          // 엔터의 경우 커서가 이미 다음 패러그래프로 넘어갔을 가능성이 큼 ($from.parentOffset === 0)
          if ($from.parentOffset === 0 && $from.pos >= 2 && $from.pos <= docSize) {
            // 커서 이전 노드(완료된 문장) 확인
            state.doc.nodesBetween($from.pos - 2, $from.pos - 1, (node: any, pos: number) => {
               if (node.isText) {
                  const words = node.text?.split(/\s+/) || [];
                  const lastWord = words[words.length - 1];
                  if (lastWord) {
                    const rep = replacements.find(r => r.from === lastWord);
                    if (rep) {
                        const from = pos + node.text!.length - lastWord.length;
                        const to = pos + node.text!.length;
                        if (from >= 0 && to <= docSize) {
                          editor.commands.insertContentAt({ from, to }, rep.to);
                        }
                    }
                  }
               }
            });
          } else if (textInBlock.endsWith(' ') && $from.pos > 1 && $from.pos <= docSize) {
            // 스페이스 입력 감지
            const words = textInBlock.trimEnd().split(/\s+/);
            const lastWord = words[words.length - 1];
            if (lastWord) {
              const rep = replacements.find(r => r.from === lastWord);
              if (rep) {
                const start = $from.pos - 1 - lastWord.length;
                const end = $from.pos - 1;
                if (start >= 0 && end <= docSize) {
                  editor.commands.insertContentAt({ from: start, to: end }, rep.to);
                }
              }
            }
          }
        });
      }
    }

    const count = text.replace(/\r?\n/g, '').length;

    // 즉시 triggerAutoSave (내부에서 3s debounce 됨)
    triggerAutoSave(content, count, plotRef.current);

    // UI 글자수 업데이트는 300ms debounce (타이핑 렉 방지)
    if (charCountTimeoutRef.current) clearTimeout(charCountTimeoutRef.current);
    charCountTimeoutRef.current = setTimeout(() => {
      setWordCount(count);
      lastCharCountRef.current = count;
    }, 300);
  }, [setWordCount, triggerAutoSave, replaceEnabled, replacements]);

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

  // 맞춤법 검사 실행 (Gemini / Claude 분기)
  const handleSpellCheck = async () => {
    if (!editorRef.current || isSpellChecking) return;
    
    setIsSpellChecking(true);
    setIsSpellCheckOpen(true);
    setSpellCheckResults([]);
    setReplacedIndices(new Set());
    setAddedToDictIndices(new Set());
    setFixedValues({});
    setHighlightedIndex(null);

    try {
      // 1. 단어장 로드
      const dictionaryItems = currentProjectId ? 
        await db.dictionary.where('projectId').equals(currentProjectId).toArray() : [];
      const dictionaryWords = dictionaryItems.map(d => d.word);

      const text = editorRef.current.getText();
      
      // API 분기: localStorage에서 선택된 AI 엔진 확인
      const provider = localStorage.getItem('pilma_ai_provider') || 'gemini';
      
      let response: Response;
      if (provider === 'claude') {
        const claudeApiKey = localStorage.getItem('pilma_claude_key') || '';
        response = await fetch('/api/ai/claude/spellcheck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, dictionary: dictionaryWords, apiKey: claudeApiKey }),
        });
      } else {
        response = await fetch('/api/ai/spellcheck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, dictionary: dictionaryWords }),
        });
      }

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
        setFixedValues(prev => ({ ...prev, [index]: suggestion }));
        setReplacedIndices(prev => new Set(prev).add(index));
        setHighlightedIndex(null); // 수정 후 하이라이트 제거
      }
      return true;
    });
  };

  // 수정 취소 (되돌리기)
  const handleRevert = (index: number) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const errorArr = spellCheckResults;
    const original = errorArr[index]?.original;
    const replacement = fixedValues[index];

    if (!original || !replacement) return;

    const { doc } = editor.state;
    let found = false;
    doc.descendants((node: any, pos: number) => {
      if (found) return false;
      if (node.isText && node.text?.includes(replacement)) {
        const start = pos + node.text.indexOf(replacement);
        editor.commands.insertContentAt({ from: start, to: start + replacement.length }, original);
        found = true;
        
        setReplacedIndices(prev => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
        setFixedValues(prev => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
      return true;
    });
  };

  // 단어장 추가
  const handleAddToDictionary = async (word: string, index: number) => {
    if (!currentProjectId || !word) return;
    try {
      await db.dictionary.add({
        id: crypto.randomUUID(),
        projectId: currentProjectId,
        word: word.trim()
      });
      setAddedToDictIndices(prev => new Set(prev).add(index));
      setHighlightedIndex(null); // 하이라이트 제거
    } catch (e) {
      console.error('Failed to add word to dictionary', e);
    }
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
        onClick={() => setAiPanelOpen(!isAiPanelOpen)}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-md transition-all",
          isAiPanelOpen ? "text-[var(--accent)]" : "text-[var(--text-disabled)] hover:text-[var(--text-primary)]"
        )}
        title={isAiPanelOpen ? "AI 패널 닫기" : "AI 패널 열기"}
      >
        <Bot size={20} />
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
      <button
        onClick={() => {
            setFindReplaceMode('find');
            setIsFindReplaceOpen(!isFindReplaceOpen);
        }}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-md transition-all",
          isFindReplaceOpen ? "text-[var(--accent)]" : "text-[var(--text-disabled)] hover:text-[var(--text-primary)]"
        )}
        title="찾기 및 바꾸기 (Ctrl+F / Ctrl+H)"
      >
        <Search size={20} />
      </button>
      <button
        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-md transition-all",
          isHistoryOpen ? "text-[var(--accent)]" : "text-[var(--text-disabled)] hover:text-[var(--text-primary)]"
        )}
        title="로컬 기록 보관소 (자동저장 시 백업)"
      >
        <Clock size={20} />
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
          onClick={() => toggleEditorPip(true)}
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
    <div className={cn("flex flex-col w-full items-center", editorPipMode ? "h-auto" : "h-full")}>
      {/* 줌 영향 안 받는 상단 레이어 */}
      {!editorPipMode && (
        <div className="w-full max-w-[760px] z-30">
          {controlsBar}
        </div>
      )}

      {/* 2. 에디터 본체 (여기에만 줌 적용) */}
      <div 
        className={cn(
          "w-full bg-[var(--bg-editor)] border border-[var(--border)] rounded-xl mx-auto relative overflow-hidden flex flex-col transition-all duration-500 ease-in-out", 
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
          maxHeight: editorPipMode ? '85vh' : 'none'
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
           className={cn("flex-1 flex flex-col", (isMobileView || editorPipMode) && "overflow-y-auto custom-scrollbar")}
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
                  findHighlightExtension,
                  spellCheckHighlightExtension,
                  // 스마트 따옴표 InputRule
                  {
                    name: 'customInputRules',
                    addInputRules() {
                      return [...customSmartQuotes];
                    },
                  } as any,
                ].filter(Boolean) as any}
                onUpdate={({ editor }) => {
                   handleUpdate(editor);
                   // 본문 내용이 바뀌면 하이라이트 강제 갱신 유도 (에디터 리로드는 아님)
                }}
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
                .spellcheck-highlight {
                   background: rgba(196, 74, 74, 0.15);
                   border-bottom: 2px wavy var(--danger);
                   transition: background 0.2s;
                }
                .find-highlight {
                  background: rgba(255, 200, 0, 0.3);
                  border-radius: 2px;
                }
                .find-highlight-current {
                  background: rgba(255, 150, 0, 0.5);
                  border-radius: 2px;
                  box-shadow: 0 0 0 1px orange;
                }
              `}</style>
            </EditorRoot>
          </div>
        </div>
      </div>

      {isSpellCheckOpen && (
        <SpellCheckPanel 
          results={spellCheckResults}
          isLoading={isSpellChecking}
          onClose={() => setIsSpellCheckOpen(false)}
          onReplace={handleReplace}
          onRevert={handleRevert}
          onAddToDictionary={handleAddToDictionary}
          onHover={(idx) => {
            setHighlightedIndex(idx);
            if (idx !== null && editorRef.current) {
               const editor = editorRef.current;
               const error = spellCheckResults[idx];
               if (error && !replacedIndices.has(idx) && !addedToDictIndices.has(idx)) {
                  const textToFind = error.original;
                  let foundPos = -1;
                  editor.state.doc.descendants((node: any, pos: number) => {
                    if (foundPos !== -1) return false;
                    if (node.isText && node.text.includes(textToFind)) {
                       foundPos = pos + node.text.indexOf(textToFind);
                    }
                  });
                  if (foundPos >= 0 && foundPos < editor.state.doc.content.size) {
                     editor.commands.setTextSelection({ from: foundPos, to: Math.min(foundPos + textToFind.length, editor.state.doc.content.size) });
                     const { view } = editor;
                     try {
                       const dom = view.nodeDOM(foundPos) || view.domAtPos(foundPos).node;
                       if (dom instanceof HTMLElement) {
                          dom.scrollIntoView({ block: 'center', behavior: 'smooth' });
                       }
                     } catch (e) {
                       console.warn('Scroll into view failed:', e);
                     }
                  }
               }
            }
          }}
          replacedIndices={replacedIndices}
          addedToDictIndices={addedToDictIndices}
          fixedValues={fixedValues}
        />
      )}

      {/* 로컬 기록 패널 */}
      {isHistoryOpen && currentSceneId && (
        <HistoryPanel
          sceneId={currentSceneId}
          onRestore={(content) => {
            if (editorRef.current) {
               editorRef.current.commands.setContent(content);
               setWordCount(editorRef.current.storage.characterCount.words());
            }
          }}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}

      {isFindReplaceOpen && (
        <FindReplacePanel 
          mode={findReplaceMode}
          findText={findText}
          replaceText={replaceText}
          setFindText={setFindText}
          setReplaceText={setReplaceText}
          currentIndex={currentMatchIndex}
          totalMatches={findMatches.length}
          onClose={() => {
              setIsFindReplaceOpen(false);
              setFindMatches([]);
              setFindText('');
          }}
          onFind={findMatchesInDoc}
          onFindNext={handleNextMatch}
          onFindPrev={handlePrevMatch}
          onReplace={executeReplaceMatch}
          onReplaceAll={handleReplaceAll}
        />
      )}


    </div>
  );

  if (editorPipMode) {
    return (
      <div className="w-full h-full flex items-center justify-center px-4 overflow-hidden">
        {/* 메인 영역 플레이스홀더 */}
        <div className="w-full max-w-[500px] min-h-[30vh] bg-[var(--bg-editor)]/40 border border-dashed border-[var(--border)] rounded-xl my-6 flex flex-col items-center justify-center p-8 text-center text-[var(--text-secondary)]">
            <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">✨ 에디터가 PIP 모드로 전환되었습니다.</h3>
            <p className="text-xs opacity-70 mb-5">화면 위에 떠 있는 플로팅 창에서 작업을 계속할 수 있습니다.</p>
            <button onClick={() => toggleEditorPip(false)} className="px-4 py-2 bg-[var(--bg-hover)] hover:bg-[var(--border)] text-[var(--text-primary)] rounded-md text-xs font-medium transition-colors border border-[var(--divider)] shadow-sm">
              원래 자리로 돌려놓기
            </button>
        </div>

        {/* PIP 플로팅 에디터 */}
        <PipWindow
          title={<span className="font-semibold text-[14px]">에디터 ✨</span>}
          position={editorPipPosition}
          onPositionChange={setEditorPipPosition}
          onRestore={() => toggleEditorPip(false)}
          onClose={() => toggleEditorPip(false)}
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
