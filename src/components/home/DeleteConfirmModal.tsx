'use client';

import React, { useState } from 'react';
import { Project } from '@/lib/db';
import { useProjectStore } from '@/store/projectStore';
import { TriangleAlert } from 'lucide-react';

interface DeleteConfirmModalProps {
  project: Project;
  onClose: () => void;
}

export function DeleteConfirmModal({ project, onClose }: DeleteConfirmModalProps) {
  const { deleteProject } = useProjectStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProject(project.id);
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
          <TriangleAlert size={24} />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">작품 삭제</h2>
        <p className="text-[14px] text-[var(--text-secondary)] mb-6 leading-relaxed">
          <span className="font-bold text-[var(--text-primary)]">'{project.title}'</span><br/>
          정말 삭제하시겠습니까?<br/>
          모든 회차 및 데이터가 삭제됩니다.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors w-full"
          >
            취소
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 w-full flex items-center justify-center gap-2"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
