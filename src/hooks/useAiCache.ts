'use client';

import { useState } from 'react';
import { db } from '@/lib/db';
import { useProjectStore } from '@/store/projectStore';
import { useAiStore } from '@/store/aiStore';

// Simple SHA-256 hash using Web Crypto API
async function sha256(source: string) {
  const sourceBytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest('SHA-256', sourceBytes);
  const resultBytes = [...new Uint8Array(digest)];
  return resultBytes.map(x => x.toString(16).padStart(2, '0')).join('');
}

export function useAiCache() {
  const currentProjectId = useProjectStore(state => state.currentProjectId);
  const setActiveCache = useAiStore(state => state.setActiveCache);
  
  const [isUploading, setIsUploading] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  const extractPlainText = (content: any): string => {
    if (!content || !content.content) return '';
    let text = '';
    for (const node of content.content) {
      if (node.type === 'paragraph' && node.content) {
        text += node.content.map((c: any) => c.text).join('') + '\n';
      }
    }
    return text.trim();
  };

  const uploadSummary = async () => {
    if (!currentProjectId) {
      setCacheMessage('프로젝트가 선택되지 않았습니다.');
      return;
    }

    setIsUploading(true);
    setCacheMessage('원고 취합 중...');

    try {
      // 1. 모든 씬 수집
      const project = await db.projects.get(currentProjectId);
      const volumes = await db.volumes.where('projectId').equals(currentProjectId).toArray();
      volumes.sort((a, b) => a.order - b.order);
      
      let fullText = '';
      
      for (const vol of volumes) {
        const chapters = await db.chapters.where('volumeId').equals(vol.id).toArray();
        chapters.sort((a, b) => a.order - b.order);
        
        for (const chap of chapters) {
          const scenes = await db.scenes.where('chapterId').equals(chap.id).toArray();
          scenes.sort((a, b) => a.order - b.order);
          
          for (const scene of scenes) {
            const rawText = extractPlainText(scene.content);
            if (rawText) {
              fullText += `[${chap.title} - ${scene.title}]\n${rawText}\n\n`;
            }
          }
        }
      }

      if (fullText.trim().length === 0) {
        setCacheMessage('요약할 원고 내용이 없습니다.');
        return;
      }

      setCacheMessage('원고 해싱 중...');
      const contentHash = await sha256(fullText);

      // 2. 기존 캐시 존재 여부 확인
      const existing = await db.ai_cache.get(currentProjectId);
      if (existing && existing.contentHash === contentHash && existing.summary) {
        setCacheMessage('이미 최신 상태입니다.');
        setActiveCache(existing.summary, existing.geminiFileUri);
        return;
      }

      setCacheMessage('AI 요약 요청 중...');
      const sumReq = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText, projectName: project?.title })
      });
      if (!sumReq.ok) throw new Error('요약 생성 실패');
      const sumRes = await sumReq.json();
      const summaryString = sumRes.summary;

      setCacheMessage('요약 파일 업로드 중...');
      const upReq = await fetch('/api/ai/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: summaryString, projectName: project?.title })
      });
      if (!upReq.ok) throw new Error('업로드 실패');
      const upRes = await upReq.json();
      const fileUri = upRes.uri;

      // 3. 캐시에 저장
      await db.ai_cache.put({
        id: currentProjectId,
        contentHash,
        geminiFileUri: fileUri || '',
        summary: summaryString,
        updatedAt: Date.now()
      });

      setActiveCache(summaryString, fileUri || null);
      setCacheMessage('업로드 성공!');
    } catch (e: any) {
      console.error(e);
      setCacheMessage(`에러 발생: ${e.message}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setCacheMessage(null), 3000);
    }
  };

  const loadCache = async (projectId: string) => {
    const existing = await db.ai_cache.get(projectId);
    if (existing && existing.summary) {
      setActiveCache(existing.summary, existing.geminiFileUri);
    } else {
      setActiveCache(null, null);
    }
  };

  return { uploadSummary, isUploading, cacheMessage, loadCache };
}
