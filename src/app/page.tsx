'use client';

import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { ProjectCard } from '@/components/home/ProjectCard';
import { NewProjectModal } from '@/components/home/NewProjectModal';
import { EditProjectModal } from '@/components/home/EditProjectModal';
import { DeleteConfirmModal } from '@/components/home/DeleteConfirmModal';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Project } from '@/lib/db';

export default function Home() {
  const { projects, loadProjects } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title' | 'createdAt'>('updatedAt');
  const [filter, setFilter] = useState<'all' | 'favorite'>('all');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadProjects();
    const savedSort = localStorage.getItem('pilma-sort') as 'updatedAt' | 'title' | 'createdAt';
    if (savedSort && ['updatedAt', 'title', 'createdAt'].includes(savedSort)) {
      setSortBy(savedSort);
    }
  }, [loadProjects]);

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
      <header className="w-full max-w-[1200px] h-16 flex items-center justify-between px-6 pt-4 shrink-0">
        <h1 className="text-2xl font-bold font-serif text-[var(--accent)] tracking-tight">필마 筆魔</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--accent)] hover:opacity-90 text-[var(--bg-base)] px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> 새 작품
        </button>
      </header>

      {/* Main */}
      <main className="w-full max-w-[1200px] flex-1 px-6 py-8 flex flex-col">
        {/* Tabs & Search/Sort */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[var(--divider)] mb-8 pb-4">
          <div className="flex items-center gap-6 self-start sm:self-auto w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`pb-1 text-[14px] font-semibold transition-colors relative whitespace-nowrap ${filter === 'all' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              모든 작품 <span className="text-[12px] opacity-70 ml-1">({projects.length})</span>
              {filter === 'all' && <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-[var(--accent)]" />}
            </button>
            <button
              onClick={() => setFilter('favorite')}
              className={`pb-1 text-[14px] font-semibold transition-colors relative whitespace-nowrap ${filter === 'favorite' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              즐겨찾기 <span className="text-[12px] opacity-70 ml-1">({projects.filter(p => p.isFavorite).length})</span>
              {filter === 'favorite' && <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-[var(--accent)]" />}
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
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
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

      {isModalOpen && <NewProjectModal onClose={() => setIsModalOpen(false)} />}
      {editingProject && <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} />}
      {deletingProject && <DeleteConfirmModal project={deletingProject} onClose={() => setDeletingProject(null)} />}
    </div>
  );
}
