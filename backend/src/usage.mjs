import { randomUUID } from "node:crypto";
import { pool } from "./db.mjs";

const operations = new Set(["architecture", "rtl", "auto_fix", "mentor"]);

function toEvent(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    versionId: row.version_id,
    autoFixAttemptId: row.auto_fix_attempt_id,
    operation: row.operation,
    provider: row.provider,
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    createdAt: row.created_at,
  };
}

/** Records one completed model request without retaining prompt text or credentials. */
export async function recordAiUsage({ projectId, versionId, autoFixAttemptId = null, operation, provider, model, usage }) {
  if (!operations.has(operation)) throw new Error("Unknown AI usage operation.");
  const { rows } = await pool.query(
    `INSERT INTO ai_usage_events
       (id, project_id, version_id, auto_fix_attempt_id, operation, provider, model, input_tokens, output_tokens, total_tokens)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      randomUUID(), projectId, versionId, autoFixAttemptId, operation, provider, model,
      usage.inputTokens, usage.outputTokens, usage.totalTokens,
    ],
  );
  return toEvent(rows[0]);
}

export async function getProjectAiUsage(projectId) {
  const { rows } = await pool.query(
    `SELECT * FROM ai_usage_events WHERE project_id = $1 ORDER BY created_at DESC LIMIT 500`,
    [projectId],
  );
  const events = rows.map(toEvent);
  const summary = events.reduce((total, event) => ({
    requestCount: total.requestCount + 1,
    usageReportedCount: total.usageReportedCount + (event.totalTokens === null ? 0 : 1),
    usageMissingCount: total.usageMissingCount + (event.totalTokens === null ? 1 : 0),
    inputTokens: total.inputTokens + (event.inputTokens ?? 0),
    outputTokens: total.outputTokens + (event.outputTokens ?? 0),
    totalTokens: total.totalTokens + (event.totalTokens ?? 0),
  }), { requestCount: 0, usageReportedCount: 0, usageMissingCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  return { summary, events };
}
