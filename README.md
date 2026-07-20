# Silicon Canvas

Silicon Canvas is a browser-based HDL simulation workspace: it compiles Verilog through a Verilator WebAssembly wrapper, renders VCD waveforms on Canvas, and provides an Auto-Fix loop for simulation failures.

> This repository is intentionally a runnable vertical-slice skeleton. Each area has a clear owner and interface so frontend, backend, simulator, and documentation work can proceed without editing the same files.

## Quick start

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000). The API health endpoint is available at [http://localhost:8080/health](http://localhost:8080/health).

For local AI generation, create `backend/.env` from `backend/.env.example` and set either the three `AZURE_OPENAI_*` values or the public `OPENAI_API_KEY` fallback. For Docker, run `docker compose --env-file backend/.env up --build`. Credentials are consumed only by the API service; do not put them in a frontend `VITE_*` variable.

## API foundation

The API currently persists versioned projects and source files in PostgreSQL. It also exposes the first complete generation path: a project prompt is transformed into an architecture specification, RTL files, and a self-checking testbench.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API and PostgreSQL health |
| `GET`, `POST` | `/api/projects` | List or create a project |
| `GET` | `/api/projects/:projectId` | Read active project/version metadata |
| `POST` | `/api/projects/:projectId/generate` | Generate architecture, RTL, and testbench for the active version |
| `POST` | `/api/projects/:projectId/versions` | Create a new version, optionally copying source files |
| `GET` | `/api/projects/:projectId/versions/:versionId` | Read files for a version |
| `PUT` | `/api/projects/:projectId/versions/:versionId/files/:path` | Save a source file |
| `POST` | `/api/projects/:projectId/versions/:versionId/simulations` | Start a browser or remote simulation run |
| `POST` | `/api/projects/:projectId/simulations/:runId/complete` | Persist a browser simulator's pass/fail result, logs, and VCD |
| `POST` | `/api/projects/:projectId/simulations/:runId/auto-fix` | Create an AI patch and a queued rerun from a failed active-version run |
| `POST` | `/api/projects/:projectId/versions/:versionId/exports` | Create constraints and a reproducible board build script |

## Repository map

| Area | Purpose | Primary owner boundary |
| --- | --- | --- |
| `frontend` | Browser editor, simulation controls, and waveform UI | Frontend |
| `backend` | Simulation jobs and Auto-Fix streaming API | Backend |
| `packages/simulator` | Verilator WASM and browser glue | Simulator |
| `packages/vcd-core` | VCD parsing and Canvas waveform model | Waveform |
| `packages/shared` | Versioned request/response contracts only | Shared interface |
| `examples` | HDL fixtures, including the RISC-V demo | Hardware |
| `docs` | Architecture and demo/submission materials | Documentation |

## Development commands

```bash
npm run dev:web
npm run dev:api
npm run check
```

## Codex acceleration

See [CODX_BUILD_LOG.md](CODX_BUILD_LOG.md) for the Codex diary, screenshots, exact prompts, and the featured complex session ID. Replace all bracketed evidence placeholders with real session material before submission.

## Submission checklist

- [ ] Replace the featured Codex session placeholder in `CODX_BUILD_LOG.md`.
- [ ] Add session screenshots under `docs/assets/codex-sessions/`.
- [ ] Record the three-minute technical demo described in `docs/DEMO_VIDEO.md`.
- [ ] Verify `docker compose up --build` from a clean machine.
