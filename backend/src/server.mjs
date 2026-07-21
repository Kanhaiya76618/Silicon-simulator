import { createServer } from "node:http";
import { URL } from "node:url";
import { config } from "./config.mjs";
import { closeDatabase, pool, runMigrations } from "./db.mjs";
import { explainHardwareDesign, generateHardwareDesign } from "./generation.mjs";
import { createAutoFix } from "./autofix.mjs";
import { createExportJob } from "./exports.mjs";
import { runWithSimulator } from "./simulator-client.mjs";
import { completeGeneration, createProject, createVersion, failGeneration, getProject, listFiles, listProjectVersions, listProjects, restoreProjectVersion, startGeneration, upsertFile } from "./projects.mjs";
import { completeAutoFixAttempt, completeSimulationRun, createAutoFixAttempt, createSimulationRun, getSimulationContext, getSimulationRun } from "./simulations.mjs";
import { getProjectAiUsage, recordAiUsage } from "./usage.mjs";

const maxBodyBytes = 1_000_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fileKinds = new Set(["rtl", "testbench", "constraints", "script", "readme"]);

function headers() {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": config.corsOrigin,
    "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, headers());
  response.end(JSON.stringify(body));
}

function sendError(response, statusCode, code, message) {
  sendJson(response, statusCode, { error: { code, message } });
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function requireString(value, field, { maxLength = 100_000, allowEmpty = false } = {}) {
  if (typeof value !== "string" || (!allowEmpty && value.trim().length === 0)) {
    const error = new Error(`${field} is required.`);
    error.statusCode = 400;
    throw error;
  }
  if (value.length > maxLength) {
    const error = new Error(`${field} must be at most ${maxLength} characters.`);
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function optionalString(value, field, maxLength) {
  if (value === undefined || value === null) return null;
  return requireString(value, field, { maxLength, allowEmpty: true });
}

function isUuid(value) {
  return typeof value === "string" && uuidPattern.test(value);
}

function projectPath(pathname) {
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  return segments[0] === "api" && segments[1] === "projects" ? segments.slice(2) : null;
}

async function handleProjectRoutes(request, response, url) {
  const segments = projectPath(url.pathname);
  if (!segments) return false;

  if (segments.length === 0 && request.method === "GET") {
    sendJson(response, 200, { projects: await listProjects() });
    return true;
  }
  if (segments.length === 0 && request.method === "POST") {
    const body = await readJson(request);
    const prompt = requireString(body.prompt, "prompt", { maxLength: 10_000 });
    const name = body.name === undefined ? undefined : requireString(body.name, "name", { maxLength: 120 });
    sendJson(response, 201, { project: await createProject({ name, prompt }) });
    return true;
  }

  const [projectId, resource, versionId, fileMarker, ...filePath] = segments;
  if (!projectId) return false;
  if (!isUuid(projectId)) {
    sendError(response, 400, "INVALID_ID", "projectId must be a UUID.");
    return true;
  }
  if ((resource === "versions" || resource === "simulations") && versionId && !isUuid(versionId)) {
    sendError(response, 400, "INVALID_ID", "versionId or simulationId must be a UUID.");
    return true;
  }
  if (!resource && request.method === "GET") {
    const project = await getProject(projectId);
    if (!project) sendError(response, 404, "PROJECT_NOT_FOUND", "Project not found.");
    else sendJson(response, 200, { project });
    return true;
  }
  if (resource === "mentor" && !versionId && request.method === "POST") {
    const body = await readJson(request);
    const question = requireString(body.question, "question", { maxLength: 4_000 });
    const project = await getProject(projectId);
    if (!project) {
      sendError(response, 404, "PROJECT_NOT_FOUND", "Project not found.");
      return true;
    }
    const answer = await explainHardwareDesign({
      prompt: project.prompt,
      architecture: project.version?.architecture ?? {},
      question,
    }, {
      onUsage: (event) => recordAiUsage({ projectId, versionId: project.activeVersionId, ...event }),
    });
    sendJson(response, 200, { answer });
    return true;
  }
  if (resource === "generate" && request.method === "POST") {
    const project = await startGeneration(projectId);
    if (!project?.activeVersionId) {
      sendError(response, 404, "PROJECT_NOT_FOUND", "Project not found.");
      return true;
    }
    try {
      const generated = await generateHardwareDesign(project.prompt, {
        onUsage: (event) => recordAiUsage({ projectId, versionId: project.activeVersionId, ...event }),
      });
      const completed = await completeGeneration(projectId, project.activeVersionId, generated.architecture, generated.files);
      sendJson(response, 200, { project: completed, architecture: generated.architecture, files: generated.files });
    } catch (error) {
      await failGeneration(projectId, project.activeVersionId);
      throw error;
    }
    return true;
  }
  if (resource === "versions" && !versionId && request.method === "POST") {
    const body = await readJson(request);
    if (body.prompt !== undefined) requireString(body.prompt, "prompt", { maxLength: 10_000 });
    if (body.copyFiles !== undefined && typeof body.copyFiles !== "boolean") {
      sendError(response, 400, "VALIDATION_ERROR", "copyFiles must be a boolean.");
      return true;
    }
    const project = await createVersion(projectId, body);
    if (!project) sendError(response, 404, "PROJECT_NOT_FOUND", "Project not found.");
    else sendJson(response, 201, { project });
    return true;
  }
  if (resource === "versions" && !versionId && request.method === "GET") {
    const project = await getProject(projectId);
    if (!project) sendError(response, 404, "PROJECT_NOT_FOUND", "Project not found.");
    else sendJson(response, 200, { versions: await listProjectVersions(projectId) });
    return true;
  }
  if (resource === "usage" && !versionId && request.method === "GET") {
    const project = await getProject(projectId);
    if (!project) sendError(response, 404, "PROJECT_NOT_FOUND", "Project not found.");
    else sendJson(response, 200, await getProjectAiUsage(projectId));
    return true;
  }
  if (resource === "versions" && versionId && fileMarker === "restore" && filePath.length === 0 && request.method === "POST") {
    const project = await restoreProjectVersion(projectId, versionId);
    if (!project) sendError(response, 404, "VERSION_NOT_FOUND", "Project version not found.");
    else sendJson(response, 201, { project });
    return true;
  }
  if (resource === "versions" && versionId && !fileMarker && request.method === "GET") {
    const project = await getProject(projectId);
    if (!project) sendError(response, 404, "PROJECT_NOT_FOUND", "Project not found.");
    else sendJson(response, 200, { files: await listFiles(projectId, versionId) });
    return true;
  }
  if (resource === "versions" && versionId && fileMarker === "simulations" && filePath.length === 0 && request.method === "POST") {
    const body = await readJson(request);
    const runner = body.runner === undefined ? "browser" : requireString(body.runner, "runner", { maxLength: 40 });
    const run = await createSimulationRun(projectId, versionId, runner);
    if (!run) sendError(response, 404, "VERSION_NOT_FOUND", "Project version not found.");
    else sendJson(response, 201, { simulation: run });
    return true;
  }
  if (resource === "versions" && versionId && fileMarker === "simulate" && filePath.length === 0 && request.method === "POST") {
    const run = await createSimulationRun(projectId, versionId, "icarus-container");
    if (!run) {
      sendError(response, 404, "VERSION_NOT_FOUND", "Project version not found.");
      return true;
    }
    const files = await listFiles(projectId, versionId);
    try {
      const result = await runWithSimulator(files);
      const simulation = await completeSimulationRun(projectId, run.id, result);
      sendJson(response, 200, { simulation });
    } catch (error) {
      await completeSimulationRun(projectId, run.id, {
        status: "failed", summary: { phase: "runner", passed: false }, logs: error.message ?? "Simulation worker unavailable.", vcdContent: null,
      });
      throw error;
    }
    return true;
  }
  if (resource === "versions" && versionId && fileMarker === "exports" && filePath.length === 0 && request.method === "POST") {
    const body = await readJson(request);
    const board = requireString(body.board, "board", { maxLength: 40 });
    const exportJob = await createExportJob(projectId, versionId, board);
    if (exportJob === null) sendError(response, 404, "VERSION_NOT_FOUND", "Project version not found.");
    else if (exportJob.error === "BOARD_NOT_SUPPORTED") sendError(response, 400, "BOARD_NOT_SUPPORTED", "Supported boards are icestick, icebreaker, and arty_a7.");
    else if (exportJob.error === "RTL_FILES_REQUIRED") sendError(response, 409, "RTL_FILES_REQUIRED", "Generate or save RTL files before export.");
    else sendJson(response, 201, { export: exportJob });
    return true;
  }
  if (resource === "versions" && versionId && fileMarker === "files" && filePath.length > 0 && request.method === "PUT") {
    const body = await readJson(request);
    const content = requireString(body.content, "content", { maxLength: 500_000, allowEmpty: true });
    const language = body.language === undefined ? "verilog" : requireString(body.language, "language", { maxLength: 40 });
    const kind = body.kind === undefined ? "rtl" : requireString(body.kind, "kind", { maxLength: 40 });
    if (!fileKinds.has(kind)) {
      sendError(response, 400, "INVALID_FILE_KIND", "kind must be rtl, testbench, constraints, script, or readme.");
      return true;
    }
    const file = await upsertFile(projectId, versionId, { path: filePath.join("/"), content, language, kind });
    if (!file) sendError(response, 404, "VERSION_NOT_FOUND", "Active project version not found.");
    else sendJson(response, 200, { file });
    return true;
  }
  if (resource === "simulations" && versionId && !fileMarker && request.method === "GET") {
    const run = await getSimulationRun(projectId, versionId);
    if (!run) sendError(response, 404, "SIMULATION_NOT_FOUND", "Simulation run not found.");
    else sendJson(response, 200, { simulation: run });
    return true;
  }
  if (resource === "simulations" && versionId && fileMarker === "complete" && request.method === "POST") {
    const body = await readJson(request);
    if (body.status !== "passed" && body.status !== "failed") {
      sendError(response, 400, "VALIDATION_ERROR", "status must be passed or failed.");
      return true;
    }
    if (body.summary !== undefined && (typeof body.summary !== "object" || body.summary === null || Array.isArray(body.summary))) {
      sendError(response, 400, "VALIDATION_ERROR", "summary must be an object.");
      return true;
    }
    const simulation = await completeSimulationRun(projectId, versionId, {
      status: body.status,
      summary: body.summary ?? {},
      logs: optionalString(body.logs, "logs", 500_000) ?? "",
      vcdContent: optionalString(body.vcdContent, "vcdContent", 500_000),
    });
    if (!simulation) sendError(response, 404, "SIMULATION_NOT_FOUND", "Running simulation not found.");
    else sendJson(response, 200, { simulation });
    return true;
  }
  if (resource === "simulations" && versionId && fileMarker === "auto-fix" && request.method === "POST") {
    const context = await getSimulationContext(projectId, versionId);
    if (!context) {
      sendError(response, 404, "SIMULATION_NOT_FOUND", "Simulation run not found.");
      return true;
    }
    const project = await getProject(projectId);
    if (project?.activeVersionId !== context.run.versionId) {
      sendError(response, 409, "VERSION_NOT_ACTIVE", "Auto-Fix can only run against the active project version.");
      return true;
    }
    const attempt = await createAutoFixAttempt(projectId, versionId);
    if (!attempt) {
      sendError(response, 409, "SIMULATION_NOT_FAILED", "Auto-Fix requires a failed simulation run.");
      return true;
    }
    try {
      const fix = await createAutoFix(context, {
        onUsage: (event) => recordAiUsage({
          projectId,
          versionId: context.run.versionId,
          autoFixAttemptId: attempt.id,
          ...event,
        }),
      });
      const nextProject = await createVersion(projectId, { prompt: project.prompt, copyFiles: true });
      for (const file of fix.files) {
        await upsertFile(projectId, nextProject.activeVersionId, file);
      }
      const rerun = await createSimulationRun(projectId, nextProject.activeVersionId, "icarus-container");
      const rerunFiles = await listFiles(projectId, nextProject.activeVersionId);
      const rerunResult = await runWithSimulator(rerunFiles);
      const completedRerun = await completeSimulationRun(projectId, rerun.id, rerunResult);
      if (!completedRerun) throw new Error("The Auto-Fix rerun did not complete.");
      const repairPassed = completedRerun.status === "passed";
      const completedAttempt = await completeAutoFixAttempt(attempt.id, {
        status: repairPassed ? "applied" : "failed",
        diagnosis: repairPassed ? fix.diagnosis : `${fix.diagnosis}\n\nThe repaired version was created, but its verification rerun still failed. Review the latest logs before trying another repair.`,
        patch: fix.files,
        resultVersionId: nextProject.activeVersionId,
      });
      sendJson(response, 200, { project: nextProject, files: rerunFiles, autoFix: completedAttempt, rerun: completedRerun });
    } catch (error) {
      await completeAutoFixAttempt(attempt.id, { status: "failed", diagnosis: error.message, patch: [], resultVersionId: null });
      throw error;
    }
    return true;
  }
  return false;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      response.writeHead(204, headers());
      response.end();
      return;
    }
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (url.pathname === "/health" && request.method === "GET") {
      await pool.query("SELECT 1");
      sendJson(response, 200, { status: "ok", service: "silicon-canvas-api", database: "connected" });
      return;
    }
    if (await handleProjectRoutes(request, response, url)) return;
    sendError(response, 404, "NOT_FOUND", "Route not found.");
  } catch (error) {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) console.error(error);
    sendError(response, statusCode, error.code ?? (statusCode >= 500 ? "INTERNAL_ERROR" : "VALIDATION_ERROR"), error.message || "Unexpected error.");
  }
});

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down.`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

runMigrations()
  .then(() => server.listen(config.port, () => console.log(`Silicon Canvas API: http://localhost:${config.port}`)))
  .catch((error) => {
    console.error("Unable to start Silicon Canvas API.", error);
    process.exit(1);
  });
