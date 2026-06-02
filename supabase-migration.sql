-- MarkdownHub — Supabase Migration
-- Run this SQL in your Supabase SQL Editor to set up the database

-- ============================================
-- TABLES
-- ============================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items table (files and folders)
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('file', 'folder')) NOT NULL,
  content TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Share links table
CREATE TABLE IF NOT EXISTS share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  permission TEXT CHECK (permission IN ('edit', 'view')) DEFAULT 'view',
  label TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_items_project ON items(project_id);
CREATE INDEX IF NOT EXISTS idx_items_parent ON items(parent_id);
CREATE INDEX IF NOT EXISTS idx_share_token ON share_links(token);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- Since we don't use authentication, we enable RLS but allow all operations.
-- In production, you'd want to restrict this.

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth required)
CREATE POLICY "Allow all on projects" ON projects
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on items" ON items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on share_links" ON share_links
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
