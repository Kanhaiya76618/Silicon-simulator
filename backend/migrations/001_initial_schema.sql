CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'failed', 'archived')),
  active_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_versions (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  source_prompt TEXT NOT NULL,
  architecture JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation_status TEXT NOT NULL DEFAULT 'draft' CHECK (generation_status IN ('draft', 'queued', 'running', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, version_number)
);

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_active_version_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_active_version_id_fkey
  FOREIGN KEY (active_version_id) REFERENCES design_versions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS design_files (
  id UUID PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'verilog',
  kind TEXT NOT NULL DEFAULT 'rtl' CHECK (kind IN ('rtl', 'testbench', 'constraints', 'script', 'readme')),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (version_id, path)
);

CREATE TABLE IF NOT EXISTS simulation_runs (
  id UUID PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'passed', 'failed', 'cancelled')),
  runner TEXT NOT NULL DEFAULT 'browser',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  logs TEXT NOT NULL DEFAULT '',
  vcd_content TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auto_fix_attempts (
  id UUID PRIMARY KEY,
  simulation_run_id UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'proposed', 'applied', 'failed')),
  diagnosis TEXT,
  patch JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_version_id UUID REFERENCES design_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  board TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  artifacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS design_versions_project_id_idx ON design_versions(project_id, version_number DESC);
CREATE INDEX IF NOT EXISTS design_files_version_id_idx ON design_files(version_id);
CREATE INDEX IF NOT EXISTS simulation_runs_version_id_idx ON simulation_runs(version_id, created_at DESC);
