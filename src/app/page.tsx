'use client';

import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { ProjectCard } from '@/components/home/ProjectCard';
import { NewProjectModal } from '@/components/home/NewProjectModal';
import { EditProjectModal } from '@/components/home/EditProjectModal';
import { DeleteConfirmModal } from '@/components/home/DeleteConfirmModal';
import { AiSettingsModal } from '@/components/settings/AiSettingsModal';
import { useRouter } from 'next/navigation';
import { Search, LogIn, LogOut, User, Loader2, Settings } from 'lucide-react';
import { Project } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { LoginModal } from '@/components/auth/LoginModal';

export default function Home() {
  const { projects, loadProjects, syncProjects } = useProjectStore();
  const { user, openLoginModal, signOut } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title' | 'createdAt'>('updatedAt');
  const [filter, setFilter] = useState<'all' | 'favorite'>('all');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadProjects();
    const savedSort = localStorage.getItem('pilma-sort') as 'updatedAt' | 'title' | 'createdAt';
    if (savedSort && ['updatedAt', 'title', 'createdAt'].includes(savedSort)) {
      setSortBy(savedSort);
    }
  }, [loadProjects]);

  // 로그인 시 Supabase와 작품 목록 동기화
  useEffect(() => {
    if (user) {
      const performSync = async () => {
        setIsSyncing(true);
        await syncProjects(user.id);
        setIsSyncing(false);
      };
      performSync();
    }
  }, [user, syncProjects]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'updatedAt' | 'title' | 'createdAt';
    setSortBy(val);
    localStorage.setItem('pilma-sort', val);
  };

  const filteredProjects = projects
    .filter(p => filter === 'all' || p.isFavorite)
    .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'updatedAt') return b.updatedAt - a.updatedAt;
      if (sortBy === 'createdAt') return a.createdAt - b.createdAt;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });

  return (
    <div className="min-h-screen bg-[var(--bg-base)] w-full flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-[1200px] h-20 flex items-center justify-between px-6 shrink-0 relative border-b border-[var(--border)]">
        <div className="flex flex-col">
          <h1 className="text-[32px] font-bold font-serif text-[var(--accent)] tracking-tight leading-none">필마 筆魔</h1>
          <span className="text-[14px] text-[var(--text-secondary)] mt-1 font-medium">웹소설 전용 에디터</span>
        </div>
        
        {/* Sync Indicator */}
        {isSyncing && (
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] px-3 py-1.5 rounded-full shadow-sm animate-in fade-in zoom-in duration-300">
            <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">로그인 정보 동기화 중...</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* AI 엔진 설정 */}
          <button
            onClick={() => setIsAiSettingsOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all group"
            title="AI 설정 (Gemini / Claude)"
          >
            <Settings size={22} className="group-hover:rotate-45 transition-transform" />
          </button>

          {user ? (
            <div className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border)] px-3 py-1.5 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                  <User size={14} />
                </div>
                <span className="text-[13px] font-medium text-[var(--text-secondary)] hidden sm:inline-block max-w-[150px] truncate">
                  {user.email}
                </span>
              </div>
              <div className="w-px h-4 bg-[var(--divider)] mx-1" />
              <button 
                onClick={() => signOut()}
                className="text-[13px] font-semibold text-[var(--text-secondary)] hover:text-red-500 transition-colors flex items-center gap-1.5"
                title="로그아웃"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={openLoginModal}
              className="text-[14px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] px-3 py-2 transition-all flex items-center gap-2"
            >
              <LogIn size={16} />
              로그인
            </button>
          )}

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[var(--accent)] hover:brightness-110 text-[var(--bg-base)] px-5 py-2 rounded-[24px] text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> 새 작품
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="w-full max-w-[1200px] flex-1 px-6 py-8 flex flex-col">
        {/* Login Promotion Banner */}
        {!user && (
          <div className="mb-6 p-4 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shrink-0">
                <LogIn size={20} />
              </div>
              <div className="flex flex-col">
                <p className="text-[14px] font-bold text-[var(--text-primary)] leading-tight">더 안전하게 작품을 보관하세요</p>
                <p className="text-[12px] text-[var(--text-secondary)] mt-1">로그인하면 기기 간 작품 동기화 및 클라우드 백업이 가능합니다.</p>
              </div>
            </div>
            <button 
              onClick={openLoginModal}
              className="bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:opacity-90 transition-all shrink-0 shadow-sm"
            >
              로그인하기
            </button>
          </div>
        )}

        {/* Tabs & Search/Sort */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[var(--divider)] mb-8 pb-4">
          <div className="flex items-center gap-6 self-start sm:self-auto w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`pb-1 text-[15px] transition-colors relative whitespace-nowrap ${filter === 'all' ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'}`}
            >
              모든 작품 <span className="text-[12px] opacity-70 ml-1">({projects.length})</span>
              {filter === 'all' && <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-full" />}
            </button>
            <button
              onClick={() => setFilter('favorite')}
              className={`pb-1 text-[15px] transition-colors relative whitespace-nowrap ${filter === 'favorite' ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'}`}
            >
              즐겨찾기 <span className="text-[12px] opacity-70 ml-1">({projects.filter(p => p.isFavorite).length})</span>
              {filter === 'favorite' && <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-full" />}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="작품 제목 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-editor)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg pl-9 pr-3 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)]" />
            </div>
            
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="bg-[var(--bg-editor)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] outline-none cursor-pointer focus:border-[var(--accent)] transition-colors"
            >
              <option value="updatedAt">최근 편집순</option>
              <option value="title">이름순</option>
              <option value="createdAt">생성순</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {filteredProjects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-disabled)] mb-20 animate-in fade-in zoom-in duration-300">
            <div className="text-6xl mb-4 opacity-50">📝</div>
            <p className="text-[15px] font-medium mb-6 text-[var(--text-secondary)]">찾으시는 작품이 없습니다.</p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="px-6 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)] rounded-lg text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all shadow-sm"
              >
                검색어 지우기
              </button>
            )}
            {!searchQuery && projects.length === 0 && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)] rounded-lg text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all shadow-sm"
              >
                새 작품 만들기
              </button>
            )}
          </div>
        ) : (
          <div 
            className="grid gap-[20px] pb-20"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
          >
            {filteredProjects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onClick={() => router.push(`/project/${project.id}`)}
                onEdit={() => setEditingProject(project)}
                onDelete={() => setDeletingProject(project)}
              />
            ))}
          </div>
        )}
      </main>

      <LoginModal />
      {isModalOpen && <NewProjectModal onClose={() => setIsModalOpen(false)} />}
      {editingProject && <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} />}
      {deletingProject && <DeleteConfirmModal project={deletingProject} onClose={() => setDeletingProject(null)} />}
      <AiSettingsModal isOpen={isAiSettingsOpen} onClose={() => setIsAiSettingsOpen(false)} />
    </div>
  );
}
