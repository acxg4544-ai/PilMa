'use client';

import React, { useState } from 'react';
import { Project } from '@/lib/db';
import { useProjectStore } from '@/store/projectStore';

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
}

export function EditProjectModal({ project, onClose }: EditProjectModalProps) {
  const { updateProject } = useProjectStore();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const [tagsInput, setTagsInput] = useState((project.tags || []).join(', '));
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    const updatedTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    
    try {
      await updateProject(project.id, {
        title: title.trim(),
        description: description.trim(),
        tags: updatedTags
      });
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">작품 정보 편집</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5">제목</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-transparent border border-[var(--border)] focus:border-[var(--accent)] rounded-lg text-[14px] text-[var(--text-primary)] outline-none transition-colors"
              placeholder="작품 제목"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 bg-transparent border border-[var(--border)] focus:border-[var(--accent)] rounded-lg text-[14px] text-[var(--text-primary)] outline-none transition-colors resize-y custom-scrollbar"
              placeholder="작품에 대한 간단한 설명을 작성하세요."
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5">태그</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-transparent border border-[var(--border)] focus:border-[var(--accent)] rounded-lg text-[14px] text-[var(--text-primary)] outline-none transition-colors"
              placeholder="판타지, 회귀, 먼치킨 (쉼표로 구분)"
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-base)] rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
