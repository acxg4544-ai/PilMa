'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { db } from '@/lib/db';

export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const { addProject } = useProjectStore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const id = await addProject(title.trim());
    
    // 기본 권/챕터/씬 자동 생성 (원활한 에디터 진입을 위해)
    const volumeId = `vol-${crypto.randomUUID()}`;
    const chapterId = `chap-${crypto.randomUUID()}`;
    const sceneId = `scene-${crypto.randomUUID()}`;

    await db.volumes.put({ id: volumeId, projectId: id, title: '제1권', order: 1 });
    await db.chapters.put({ id: chapterId, volumeId: volumeId, title: '제1화', order: 1 });
    await db.scenes.put({
      id: sceneId,
      projectId: id,
      chapterId: chapterId,
      title: '새로운 씬',
      order: 1,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      wordCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    onClose();
    router.push(`/project/${id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-sm shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md transition-colors"
        >
          <X size={16} />
        </button>
        
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6 font-serif">새 작품 만들기</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">
              작품 제목
            </label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={50}
              className="w-full bg-[var(--bg-base)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-4 py-2.5 text-[14px] text-[var(--text-primary)] outline-none transition-colors"
            />
          </div>
          
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
               type="button"
               onClick={onClose}
               className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              취소
            </button>
            <button
               type="submit"
               disabled={!title.trim() || isSubmitting}
               className="px-6 py-2 bg-[var(--accent)] text-[var(--bg-base)] rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 shadow-sm"
            >
              만들기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
