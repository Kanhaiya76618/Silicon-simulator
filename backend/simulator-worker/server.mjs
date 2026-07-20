import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

const port = Number(process.env.PORT ?? 8090);
const maxBodyBytes = 2_000_000;
const maxFileBytes = 500_000;
const timeoutMs = 15_000;
const blockedSystemTasks = /\$(?:system|fopen|fread|fwrite|readmem[bh]|dumplimit)\b/i;

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error("Simulation request is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validateFiles(files) {
  if (!Array.isArray(files) || files.length === 0 || files.length > 30) throw new Error("Simulation requires one to 30 Verilog files.");
  for (const file of files) {
    if (typeof file?.path !== "string" || !/^[A-Za-z0-9_./-]+\.(?:v|sv)$/.test(file.path) || file.path.includes("..")) {
      throw new Error("Simulation contains an invalid file path.");
    }
    if (typeof file.content !== "string" || Buffer.byteLength(file.content) > maxFileBytes) {
      throw new Error("Simulation contains an invalid source file.");
    }
    if (blockedSystemTasks.test(file.content)) {
      throw new Error(`Unsafe system task blocked in ${file.path}.`);
    }
  }
}

function execute(command, args, cwd) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let timedOut = false;
    const append = (chunk) => { output += chunk.toString(); if (output.length > 500_000) output = output.slice(-500_000); };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.on("error", (error) => { clearTimeout(timer); resolvePromise({ exitCode: 1, output: `${output}\n${error.message}`, timedOut }); });
    child.on("close", (exitCode) => { clearTimeout(timer); resolvePromise({ exitCode: exitCode ?? 1, output, timedOut }); });
  });
}

async function runSimulation(files) {
  validateFiles(files);
  const directory = await mkdtemp(join(tmpdir(), "silicon-canvas-"));
  try {
    const sourcePaths = [];
    for (const file of files) {
      const destination = resolve(directory, file.path);
      if (!destination.startsWith(`${directory}${sep}`)) throw new Error("Simulation file escaped its workspace.");
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, file.content, "utf8");
      sourcePaths.push(file.path);
    }
    await writeFile(join(directory, "silicon_canvas_dump.v"), "module silicon_canvas_dump; initial begin $dumpfile(\"simulation.vcd\"); $dumpvars(0); end endmodule\n", "utf8");
    sourcePaths.push("silicon_canvas_dump.v");
    const compilation = await execute("iverilog", ["-g2012", "-o", "simulation.vvp", ...sourcePaths], directory);
    if (compilation.exitCode !== 0 || compilation.timedOut) {
      return { status: "failed", logs: `${compilation.timedOut ? "Compilation timed out.\n" : ""}${compilation.output}`, vcdContent: null, summary: { phase: "compile", passed: false } };
    }
    const execution = await execute("vvp", ["simulation.vvp"], directory);
    let vcdContent = null;
    try { vcdContent = await readFile(join(directory, "simulation.vcd"), "utf8"); } catch { /* A testbench may intentionally omit traces. */ }
    const passed = execution.exitCode === 0 && !execution.timedOut;
    return {
      status: passed ? "passed" : "failed",
      logs: `${compilation.output}${execution.timedOut ? "Simulation timed out.\n" : ""}${execution.output}`,
      vcdContent: vcdContent?.slice(0, 1_000_000) ?? null,
      summary: { phase: "simulate", passed, vcdGenerated: Boolean(vcdContent), outputTruncated: Boolean(vcdContent && vcdContent.length > 1_000_000) },
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") return sendJson(response, 200, { status: "ok", engine: "iverilog" });
  if (request.method !== "POST" || request.url !== "/run") return sendJson(response, 404, { error: "Not found" });
  try {
    const body = await readJson(request);
    sendJson(response, 200, await runSimulation(body.files));
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Simulation failed." });
  }
}).listen(port, () => console.log(`Silicon Canvas simulator worker: http://localhost:${port}`));
