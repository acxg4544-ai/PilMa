'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { useAiCache } from '@/hooks/useAiCache';
import { useProjectStore } from '@/store/projectStore';
import { useAiStore } from '@/store/aiStore';

export function SummaryUploader() {
  const [mounted, setMounted] = useState(false);
  const { uploadSummary, isUploading, cacheMessage, loadCache } = useAiCache();
  const currentProjectId = useProjectStore(state => state.currentProjectId);
  const activeCacheSummary = useAiStore(state => state.activeCacheSummary);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && currentProjectId) {
      loadCache(currentProjectId);
    }
  }, [currentProjectId, mounted]);

  if (!mounted) return <div className="w-10 h-10" />;

  return (
    <div className="relative group">
      <button
        onClick={uploadSummary}
        disabled={isUploading || !currentProjectId}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--accent)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:hover:bg-transparent transition-all group/btn shrink-0"
        title="전체 원고 분석 및 AI 요약 업로드 (Gemini File API 캐싱)"
      >
        {isUploading ? (
          <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
        ) : activeCacheSummary ? (
          <div className="relative">
            <Upload size={24} className="group-hover/btn:translate-y-[-2px] transition-transform" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--bg-sidebar)] flex items-center justify-center">
              <CheckCircle2 size={8} className="text-white" />
            </div>
          </div>
        ) : (
          <Upload size={24} className="group-hover/btn:translate-y-[-2px] transition-transform" />
        )}
      </button>

      {cacheMessage && (
        <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-pm-panel border border-pm-border shadow-2xl rounded-lg px-4 py-2 z-[1000] text-[13px] font-bold text-pm-accent animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none">
          <div className="flex items-center gap-2">
            {isUploading && <Loader2 size={14} className="animate-spin" />}
            {cacheMessage}
          </div>
        </div>
      )}
    </div>
  );
}
