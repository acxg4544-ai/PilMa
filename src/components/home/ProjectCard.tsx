'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Project, db } from '@/lib/db';
import { Star, Camera, Loader2, MoreVertical, Edit2, Trash2, Image as ImageIcon, Download } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { supabase } from '@/lib/supabase';

export function ProjectCard({ 
  project, 
  onClick, 
  onEdit, 
  onDelete 
}: { 
  project: Project; 
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { updateProject } = useProjectStore();
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(project.title);
  const [isUploading, setIsUploading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateProject(project.id, { isFavorite: !project.isFavorite });
  };

  const startEditing = () => {
    setIsEditingTitle(true);
    setEditTitle(project.title);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditingTitle) return;

    if (clickTimeoutRef.current) {
      // 더블 클릭 발생
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      startEditing();
    } else {
      // 단일 클릭 (250ms 대기 후 이동)
      clickTimeoutRef.current = setTimeout(() => {
        onClick();
        clickTimeoutRef.current = null;
      }, 250);
    }
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    const newTitle = editTitle.trim() || '제목 없음';
    if (newTitle !== project.title) {
      updateProject(project.id, { title: newTitle });
    } else {
      setEditTitle(project.title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSubmit();
    if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditTitle(project.title);
    }
  };

  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context not available');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject('Canvas toBlob failed');
        }, file.type, 0.9);
      };
      img.onerror = reject;
    });
  };

  const handleCoverClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const resizedBlob = await resizeImage(file, 400, 600);
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${project.id}_${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from('covers')
        .upload(fileName, resizedBlob, {
          contentType: file.type,
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(fileName);

      setImageError(false); // reset error state on new upload
      await updateProject(project.id, { coverUrl: publicUrl });
    } catch (err: any) {
      console.error('Failed to upload cover', err);
      const isBucketError = err.message?.includes('Bucket not found') || err.error === 'Bucket not found';
      if (isBucketError) {
        alert('Supabase 설정 오류: "covers" 스토리지 버킷이 생성되지 않았습니다.\n1. Supabase 대시보드의 [Storage] 메뉴로 이동\n2. "New bucket" 클릭 -> Name: "covers" 입력\n3. "Public bucket" 체크 후 생성해주세요');
      } else {
        alert(`커버 이미지 업로드 실패. 사유: ${err.message || '알 수 없는 오류'}`);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTxt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);

    try {
      // 1. 데이터 로드 (Volumes -> Chapters -> Scenes)
      const volumes = await db.volumes.where('projectId').equals(project.id).sortBy('order');
      let fullText = '';

      for (const volume of volumes) {
        // 세계관 폴더 제외 (🗺️, 🌍 아이콘 또는 이름에 '세계관' 포함)
        const isWorldview = volume.icon === '🗺️' || volume.icon === '🌍' || volume.title.includes('세계관');
        if (isWorldview) continue;

        // 볼륨 제목 추가
        fullText += `【${volume.title}】\n\n`;

        const chapters = await db.chapters.where('volumeId').equals(volume.id).sortBy('order');
        for (const chapter of chapters) {
          // 챕터 제목 추가
          fullText += `── ${chapter.title} ──\n\n`;

          const scenes = await db.scenes.where('chapterId').equals(chapter.id).sortBy('order');
          for (const scene of scenes) {
            if (!scene.content) continue;

            // TipTap JSON/HTML -> Text 변환
            let sceneText = '';
            if (typeof scene.content === 'string') {
              // HTML인 경우 (간단한 태그 제거)
              sceneText = scene.content
                .replace(/<p>/g, '')
                .replace(/<\/p>/g, '\n')
                .replace(/<br\s*\/?>/g, '\n')
                .replace(/<[^>]*>/g, '')
                .trim();
            } else if (scene.content.content) {
              // TipTap JSON인 경우
              const extractText = (nodes: any[]): string => {
                return nodes.map(node => {
                  if (node.type === 'text') return node.text || '';
                  if (node.content) {
                    const childText = extractText(node.content);
                    if (node.type === 'paragraph' || node.type === 'heading') return childText + '\n';
                    return childText;
                  }
                  if (node.type === 'paragraph' || node.type === 'heading') return '\n';
                  return '';
                }).join('');
              };
              sceneText = extractText(scene.content.content).trim();
            }

            if (!sceneText) continue;

            // 회차 제목 및 본문 결합
            fullText += `===== ${scene.title} =====\n\n`;
            fullText += sceneText;
            fullText += '\n\n\n'; // 회차 간 간격 (지시사항: 빈 줄 2개 포함이므로 \n\n\n)
          }
        }
      }

      if (!fullText.trim()) {
        alert('다운로드할 내용이 없습니다.');
        return;
      }

      // 2. 파일 다운로드 실행
      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.title}_전체원고.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Failed to download project TXT:', err);
      alert('파일 생성 중 오류가 발생했습니다.');
    }
  };

  const formattedDate = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(project.updatedAt));

  return (
    <div 
      onClick={onClick}
      className="relative w-full aspect-[2/3] border border-[var(--border)] rounded-[12px] overflow-hidden cursor-pointer transition-all duration-200 ease-in-out hover:border-[var(--accent)] hover:scale-[1.03] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] group flex flex-col justify-end"
    >
      {/* Background Image / Placeholder */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[var(--bg-editor)] to-[var(--bg-hover)]">
        {project.coverUrl && !imageError ? (
          <Image 
            src={project.coverUrl} 
            alt={`${project.title} 표지`} 
            width={400}
            height={600}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <ImageIcon size={48} className="mb-2 text-[var(--text-primary)] opacity-30" />
            <span className="text-[12px] text-[var(--text-primary)] opacity-30 font-medium tracking-tight">표지를 추가해보세요</span>
          </div>
        )}
      </div>

      {/* Cover Update Button (Small, Top Left) */}
      <button 
        onClick={handleCoverClick}
        className="absolute top-3 left-3 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-[var(--accent)] transition-all z-30 opacity-0 group-hover:opacity-100 text-white/80 hover:text-white"
        title="표지 변경"
      >
        <Camera size={16} />
      </button>

      {isUploading && (
        <div className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center">
          <Loader2 size={32} className="animate-spin text-white mb-2" />
          <span className="text-[13px] text-white/80 font-medium tracking-wide">업로드 중...</span>
        </div>
      )}

      {/* Action Buttons Container (Top Right) */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ opacity: project.isFavorite || isMenuOpen ? 1 : undefined }}>
        {/* Favorite Button */}
        <button 
          onClick={handleFavoriteClick}
          className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 transition-colors"
          title={project.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          <Star size={15} className={project.isFavorite ? "fill-[var(--accent)] text-[var(--accent)]" : "text-white/80"} />
        </button>

        {/* More Menu */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
            className={`p-2 rounded-full backdrop-blur-md border border-white/10 transition-colors ${isMenuOpen ? 'bg-black/70 text-white' : 'bg-black/40 hover:bg-black/60 text-white/80'}`}
            title="더보기"
          >
            <MoreVertical size={15} />
          </button>
          
          {isMenuOpen && (
            <div className="absolute top-full mt-2 right-0 w-32 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              <button 
                onClick={handleDownloadTxt}
                className="w-full px-3 py-2 flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
              >
                <Download size={13} />
                <span>전체 다운로드 (TXT)</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(); }}
                className="w-full px-3 py-2 flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
              >
                <Edit2 size={13} />
                <span>정보 편집</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDelete(); }}
                className="w-full px-3 py-2 flex items-center gap-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors text-left"
              >
                <Trash2 size={13} />
                <span>삭제</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileChange} 
        onClick={(e) => e.stopPropagation()}
      />

      {/* Info Overlay at Bottom */}
      <div 
        className="relative z-20 w-full pt-20 pb-4 px-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col"
        onClick={handleTitleClick}
      >
        <div>
          {isEditingTitle ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-black/50 border border-white/30 rounded focus:outline-none focus:border-white/80 px-2 py-1 text-[16px] font-bold font-serif text-white mb-0.5 backdrop-blur-sm"
            />
          ) : (
            <h3 className="font-serif text-[16px] font-bold text-white mb-0.5 line-clamp-2 leading-snug cursor-text drop-shadow-md" title="더블클릭하여 제목 수정">
              {project.title}
            </h3>
          )}
        </div>
        <span className="text-[12px] text-white/70 font-medium drop-shadow-md mt-1">{formattedDate}</span>
      </div>
    </div>
  );
}
