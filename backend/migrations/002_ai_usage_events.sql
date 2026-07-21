CREATE TABLE IF NOT EXISTS ai_usage_events (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES design_versions(id) ON DELETE SET NULL,
  auto_fix_attempt_id UUID REFERENCES auto_fix_attempts(id) ON DELETE SET NULL,
  operation TEXT NOT NULL CHECK (operation IN ('architecture', 'rtl', 'auto_fix')),
  provider TEXT NOT NULL CHECK (provider IN ('azure', 'openai')),
  model TEXT NOT NULL,
  input_tokens INTEGER CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
  total_tokens INTEGER CHECK (total_tokens IS NULL OR total_tokens >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_project_created_idx
  ON ai_usage_events(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_events_version_created_idx
  ON ai_usage_events(version_id, created_at DESC);
