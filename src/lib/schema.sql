-- ============================================================
-- PilMa (필마) Supabase 스키마 (참고용 - 직접 실행하지 않음)
-- 판깔(PanKKal)과 동일한 Supabase 인스턴스 사용
-- 테이블 접두사: bnw_ (Book Note Writer)
-- ============================================================

-- 프로젝트 테이블
CREATE TABLE bnw_projects (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '새 프로젝트',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 권(Volume) 테이블
CREATE TABLE bnw_volumes (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES bnw_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 챕터 테이블
CREATE TABLE bnw_chapters (
  id TEXT PRIMARY KEY,
  volume_id TEXT REFERENCES bnw_volumes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 씬 테이블
CREATE TABLE bnw_scenes (
  id TEXT PRIMARY KEY,
  chapter_id TEXT REFERENCES bnw_chapters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INT DEFAULT 0,
  content JSONB,
  word_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS (Row Level Security) 설정
-- ============================================================

-- bnw_projects RLS
ALTER TABLE bnw_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own projects" ON bnw_projects
  FOR ALL USING (auth.uid() = user_id);

-- bnw_volumes RLS
ALTER TABLE bnw_volumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own volumes" ON bnw_volumes
  FOR ALL USING (auth.uid() = user_id);

-- bnw_chapters RLS
ALTER TABLE bnw_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own chapters" ON bnw_chapters
  FOR ALL USING (auth.uid() = user_id);

-- bnw_scenes RLS
ALTER TABLE bnw_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own scenes" ON bnw_scenes
  FOR ALL USING (auth.uid() = user_id);
