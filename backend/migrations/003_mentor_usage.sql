ALTER TABLE ai_usage_events DROP CONSTRAINT IF EXISTS ai_usage_events_operation_check;
ALTER TABLE ai_usage_events
  ADD CONSTRAINT ai_usage_events_operation_check
  CHECK (operation IN ('architecture', 'rtl', 'auto_fix', 'mentor'));
