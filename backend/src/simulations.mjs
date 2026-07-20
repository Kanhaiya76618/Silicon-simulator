import { randomUUID } from "node:crypto";
import { pool } from "./db.mjs";

function toRun(row) {
  return {
    id: row.id,
    versionId: row.version_id,
    status: row.status,
    runner: row.runner,
    summary: row.summary,
    logs: row.logs,
    vcdContent: row.vcd_content,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function createSimulationRun(projectId, versionId, runner = "browser") {
  const { rows } = await pool.query(
    `SELECT v.id FROM design_versions v WHERE v.id = $2 AND v.project_id = $1`,
    [projectId, versionId],
  );
  if (!rows[0]) return null;
  const id = randomUUID();
  const result = await pool.query(
    `INSERT INTO simulation_runs (id, version_id, status, runner, started_at)
     VALUES ($1, $2, 'running', $3, NOW())
     RETURNING *`,
    [id, versionId, runner],
  );
  return toRun(result.rows[0]);
}

export async function getSimulationRun(projectId, runId) {
  const { rows } = await pool.query(
    `SELECT s.* FROM simulation_runs s
     JOIN design_versions v ON v.id = s.version_id
     WHERE v.project_id = $1 AND s.id = $2`,
    [projectId, runId],
  );
  return rows[0] ? toRun(rows[0]) : null;
}

export async function completeSimulationRun(projectId, runId, { status, summary, logs, vcdContent }) {
  const { rows } = await pool.query(
    `UPDATE simulation_runs s SET status = $3, summary = $4, logs = $5, vcd_content = $6, completed_at = NOW()
     FROM design_versions v WHERE s.version_id = v.id AND v.project_id = $1 AND s.id = $2
       AND s.status IN ('queued', 'running')
     RETURNING s.*`,
    [projectId, runId, status, summary, logs, vcdContent],
  );
  return rows[0] ? toRun(rows[0]) : null;
}

export async function getSimulationContext(projectId, runId) {
  const run = await getSimulationRun(projectId, runId);
  if (!run) return null;
  const { rows: files } = await pool.query(
    `SELECT path, kind, content FROM design_files WHERE version_id = $1 ORDER BY path`,
    [run.versionId],
  );
  return { run, files };
}

export async function createAutoFixAttempt(projectId, runId) {
  const run = await getSimulationRun(projectId, runId);
  if (!run || run.status !== "failed") return null;
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO auto_fix_attempts (id, simulation_run_id, status)
     VALUES ($1, $2, 'running') RETURNING id, status, created_at`,
    [id, runId],
  );
  return { id: rows[0].id, status: rows[0].status, createdAt: rows[0].created_at };
}

export async function completeAutoFixAttempt(attemptId, { status, diagnosis, patch, resultVersionId }) {
  const { rows } = await pool.query(
    `UPDATE auto_fix_attempts SET status = $2, diagnosis = $3, patch = $4,
       result_version_id = $5, completed_at = NOW() WHERE id = $1
     RETURNING id, status, diagnosis, patch, result_version_id, created_at, completed_at`,
    [attemptId, status, diagnosis, patch, resultVersionId],
  );
  const row = rows[0];
  return row && {
    id: row.id, status: row.status, diagnosis: row.diagnosis, patch: row.patch,
    resultVersionId: row.result_version_id, createdAt: row.created_at, completedAt: row.completed_at,
  };
}
