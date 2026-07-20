import { randomUUID } from "node:crypto";
import { pool } from "./db.mjs";

function nameFromPrompt(prompt) {
  const text = prompt.replace(/\s+/g, " ").trim();
  return text.length > 72 ? `${text.slice(0, 69)}...` : text || "Untitled design";
}

function toVersion(row) {
  return {
    id: row.version_id,
    number: row.version_number,
    sourcePrompt: row.source_prompt,
    architecture: row.architecture,
    generationStatus: row.generation_status,
    createdAt: row.version_created_at,
  };
}

function toProject(row) {
  return {
    id: row.project_id,
    name: row.name,
    prompt: row.prompt,
    status: row.status,
    activeVersionId: row.active_version_id,
    createdAt: row.project_created_at,
    updatedAt: row.updated_at,
    version: row.version_id ? toVersion(row) : null,
  };
}

function toStandaloneVersion(row) {
  return {
    id: row.id,
    number: row.version_number,
    sourcePrompt: row.source_prompt,
    architecture: row.architecture,
    generationStatus: row.generation_status,
    createdAt: row.created_at,
  };
}

const selectProject = `
  SELECT p.id AS project_id, p.name, p.prompt, p.status, p.active_version_id,
    p.created_at AS project_created_at, p.updated_at,
    v.id AS version_id, v.version_number, v.source_prompt, v.architecture,
    v.generation_status, v.created_at AS version_created_at
  FROM projects p
  LEFT JOIN design_versions v ON v.id = p.active_version_id`;

export async function getProject(projectId) {
  const { rows } = await pool.query(`${selectProject} WHERE p.id = $1`, [projectId]);
  return rows[0] ? toProject(rows[0]) : null;
}

export async function listProjects() {
  const { rows } = await pool.query(`${selectProject} ORDER BY p.updated_at DESC LIMIT 100`);
  return rows.map(toProject);
}

export async function listProjectVersions(projectId) {
  const { rows } = await pool.query(
    `SELECT id, version_number, source_prompt, architecture, generation_status, created_at
     FROM design_versions WHERE project_id = $1 ORDER BY version_number DESC`,
    [projectId],
  );
  return rows.map(toStandaloneVersion);
}

/** Create a new active version from any previous version without mutating history. */
export async function restoreProjectVersion(projectId, sourceVersionId) {
  const client = await pool.connect();
  const newVersionId = randomUUID();
  try {
    await client.query("BEGIN");
    const { rows: sourceRows } = await client.query(
      `SELECT source_prompt, architecture, generation_status
       FROM design_versions WHERE project_id = $1 AND id = $2`,
      [projectId, sourceVersionId],
    );
    const source = sourceRows[0];
    if (!source) {
      await client.query("ROLLBACK");
      return null;
    }
    const { rows: projectRows } = await client.query(
      `SELECT COALESCE(MAX(version_number), 0) AS latest_version FROM design_versions WHERE project_id = $1`,
      [projectId],
    );
    const nextNumber = Number(projectRows[0].latest_version) + 1;
    await client.query(
      `INSERT INTO design_versions (id, project_id, version_number, source_prompt, architecture, generation_status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [newVersionId, projectId, nextNumber, source.source_prompt, source.architecture, source.generation_status],
    );
    await client.query(
      `INSERT INTO design_files (id, version_id, path, language, kind, content)
       SELECT gen_random_uuid(), $1, path, language, kind, content
       FROM design_files WHERE version_id = $2`,
      [newVersionId, sourceVersionId],
    );
    const projectStatus = source.generation_status === "completed" ? "ready" : "draft";
    await client.query(
      "UPDATE projects SET active_version_id = $2, prompt = $3, status = $4, updated_at = NOW() WHERE id = $1",
      [projectId, newVersionId, source.source_prompt, projectStatus],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getProject(projectId);
}

export async function createProject({ name, prompt }) {
  const client = await pool.connect();
  const projectId = randomUUID();
  const versionId = randomUUID();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO projects (id, name, prompt) VALUES ($1, $2, $3)",
      [projectId, name?.trim() || nameFromPrompt(prompt), prompt],
    );
    await client.query(
      "INSERT INTO design_versions (id, project_id, version_number, source_prompt) VALUES ($1, $2, 1, $3)",
      [versionId, projectId, prompt],
    );
    await client.query(
      "UPDATE projects SET active_version_id = $2 WHERE id = $1",
      [projectId, versionId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getProject(projectId);
}

export async function createVersion(projectId, { prompt, copyFiles = true }) {
  const client = await pool.connect();
  const versionId = randomUUID();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT p.active_version_id, p.prompt, COALESCE(MAX(v.version_number), 0) AS latest_version
       FROM projects p LEFT JOIN design_versions v ON v.project_id = p.id
       WHERE p.id = $1 GROUP BY p.id`,
      [projectId],
    );
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    const sourcePrompt = prompt?.trim() || rows[0].prompt;
    await client.query(
      "INSERT INTO design_versions (id, project_id, version_number, source_prompt) VALUES ($1, $2, $3, $4)",
      [versionId, projectId, Number(rows[0].latest_version) + 1, sourcePrompt],
    );
    if (copyFiles && rows[0].active_version_id) {
      await client.query(
        `INSERT INTO design_files (id, version_id, path, language, kind, content)
         SELECT gen_random_uuid(), $1, path, language, kind, content
         FROM design_files WHERE version_id = $2`,
        [versionId, rows[0].active_version_id],
      );
    }
    await client.query(
      "UPDATE projects SET active_version_id = $2, prompt = $3, status = 'draft', updated_at = NOW() WHERE id = $1",
      [projectId, versionId, sourcePrompt],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getProject(projectId);
}

export async function listFiles(projectId, versionId) {
  const { rows } = await pool.query(
    `SELECT f.id, f.path, f.language, f.kind, f.content, f.created_at, f.updated_at
     FROM design_files f JOIN design_versions v ON v.id = f.version_id
     WHERE v.project_id = $1 AND f.version_id = $2 ORDER BY f.path`,
    [projectId, versionId],
  );
  return rows.map((row) => ({
    id: row.id, path: row.path, language: row.language, kind: row.kind, content: row.content,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }));
}

export async function upsertFile(projectId, versionId, { path, language = "verilog", kind = "rtl", content }) {
  const project = await getProject(projectId);
  if (!project || project.activeVersionId !== versionId) return null;
  const { rows } = await pool.query(
    `INSERT INTO design_files (id, version_id, path, language, kind, content)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (version_id, path) DO UPDATE SET language = EXCLUDED.language,
       kind = EXCLUDED.kind, content = EXCLUDED.content, updated_at = NOW()
     RETURNING id, path, language, kind, content, created_at, updated_at`,
    [randomUUID(), versionId, path, language, kind, content],
  );
  await pool.query("UPDATE projects SET updated_at = NOW() WHERE id = $1", [projectId]);
  const row = rows[0];
  return { id: row.id, path: row.path, language: row.language, kind: row.kind, content: row.content,
    createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function startGeneration(projectId) {
  const project = await getProject(projectId);
  if (!project?.activeVersionId) return null;
  await pool.query(
    "UPDATE projects SET status = 'generating', updated_at = NOW() WHERE id = $1",
    [projectId],
  );
  await pool.query(
    "UPDATE design_versions SET generation_status = 'running' WHERE id = $1",
    [project.activeVersionId],
  );
  return getProject(projectId);
}

export async function completeGeneration(projectId, versionId, architecture, files) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE design_versions SET architecture = $2, generation_status = 'completed' WHERE id = $1",
      [versionId, architecture],
    );
    for (const file of files) {
      await client.query(
        `INSERT INTO design_files (id, version_id, path, language, kind, content)
         VALUES ($1, $2, $3, 'verilog', $4, $5)
         ON CONFLICT (version_id, path) DO UPDATE SET kind = EXCLUDED.kind,
           content = EXCLUDED.content, updated_at = NOW()`,
        [randomUUID(), versionId, file.path, file.kind, file.content],
      );
    }
    await client.query("UPDATE projects SET status = 'ready', updated_at = NOW() WHERE id = $1", [projectId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getProject(projectId);
}

export async function failGeneration(projectId, versionId) {
  await pool.query(
    "UPDATE projects SET status = 'failed', updated_at = NOW() WHERE id = $1",
    [projectId],
  );
  await pool.query(
    "UPDATE design_versions SET generation_status = 'failed' WHERE id = $1",
    [versionId],
  );
}
