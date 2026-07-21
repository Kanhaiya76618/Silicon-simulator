# Codex Build Log — Silicon Canvas

## 1. Executive summary

Silicon Canvas is a browser-based HDL design workspace. At the start of this Codex session, the checked-out branch contained two commits: a 19-file React/Vite frontend skeleton and a 15-file backend skeleton. The frontend had a landing page, an editor pane, a two-node read-only React Flow graph, and a placeholder waveform panel; it had no circuit-designer workflow, no agent mission-control UI, and no build-log file. This log now records the completed frontend upgrade **and** the persistent backend delivery: structured Azure generation, versions, isolated simulation/VCD evidence, Auto-Fix, token usage, Mentor, and FPGA export artifacts. Commit and final line-count placeholders will be filled after the work is committed.

## 2. Featured session

**Session ID:** `[HUMAN: paste the most complex Codex session ID here before submission]`

### Frontend visual circuit designer and deterministic RTL compiler

**Goal:** Turn the static two-node architecture graph into an editable circuit-design workflow that emits synthesizable-style Verilog without AI credentials, while keeping the frontend independent of backend implementation changes.

**Task given to Codex:** “work only in frontend and make sure use your best skill for ui … Visual Circuit Designer … deterministic netlist compiler … agent timeline … frontend glow-up.”

**Plan:** Audit the existing React 19, Vite, Tailwind, Zustand, Monaco, and React Flow frontend; split the workspace into focused feature modules; add a new designer state store and a pure compiler; then add an agent mission-control UI and visual polish around the existing editor flow.

**Implementation record:** `[Completed feature details and final file list are appended in the chronological diary below.]`

**Obstacles and debugging:** The baseline frontend declared React Router 7 while importing React Router 6 APIs (`Route`, `Routes`, `BrowserRouter`, and `useNavigate`). The compatible dependency correction and build verification are recorded in the diary entry for this session.

**Verification:** `[HUMAN: capture terminal output showing frontend npm run build and a browser screenshot of the Circuit Designer and agent timeline. Save as docs/assets/codex-sessions/2026-07-21-circuit-designer-agentic-ui.png.]`

## 3. Chronological diary

### 2026-07-21T12:05:21+05:30 — Audited baseline frontend and created the judging diary

**Task given to Codex:** “work only in frontend … add everything till now you did with detail date and time and how, what and why you did this.”

**What Codex did:** Read the supplied hackathon task brief, inspected `frontend/src/App.tsx`, `frontend/src/components/LandingPage.tsx`, `frontend/src/store/hardwareStore.ts`, `frontend/src/index.css`, `frontend/package.json`, and the repository commit history. Created this root-level `CODX_BUILD_LOG.md` because none existed in the checked-out branch. Recorded the verified baseline: commit `62c1852` created the 19-file frontend scaffold; commit `531f42f` added the backend skeleton.

**Problems hit & how Codex solved them:** The task brief referred to a larger monorepo, but the checked-out frontend contained only the small skeleton. Codex treated the files actually present as the source of truth and limited implementation work to `frontend/`.

**How it was verified:** Ran `git log --stat --date=iso`, `git show --stat 62c1852`, `git show --stat 531f42f`, and read the existing frontend source.

**Evidence:** `62c1852`, `531f42f`; `[HUMAN: capture docs/assets/codex-sessions/2026-07-21-baseline-audit.png showing the existing workspace before the upgrade.]`

### 2026-07-21T12:05:21+05:30 — Built the visual Circuit Designer and deterministic RTL path

**Task given to Codex:** “work only in frontend and make sure use your best skill for ui … Build a new Circuit Designer mode where users DESIGN a circuit visually on a canvas, and Verilog RTL is generated from that schematic.”

**What Codex did:** Added `frontend/src/features/designer/netlistCompiler.ts`, a pure deterministic schematic compiler. It accepts visual circuit nodes and connections, sanitizes instance names, emits a Verilog-2001 module declaration from I/O pins, declares internal wires, emits primitive logic gates and starter sequential/datapath statements, connects output pins, returns warnings, and records a node-to-line source map. Added `frontend/src/features/designer/designerStore.ts`, a dedicated Zustand store rather than expanding `hardwareStore.ts`; it owns graph nodes, edges, selection, history, redo state, validation warnings, duplicate/delete actions, and combinational-loop detection. Added `frontend/src/features/designer/CircuitDesigner.tsx`, which uses custom React Flow nodes, typed handles, component palette categories, drag/click insertion, pan/zoom/minimap, snap grid, selection inspector, duplicate/delete/undo/redo controls, width selection, and Generate RTL. Refactored the workspace into `frontend/src/features/workspace/Workspace.tsx` and made the generated RTL open in the existing Monaco editor via the shared frontend store.

**Problems hit & how Codex solved them:** The first production build stopped at `src/features/waveform/WaveformPanel.tsx(20,1040): error TS1005: ')' expected.` The waveform cursor click handler had one missing closing parenthesis in a deeply nested JSX expression. Codex replaced that expression with the named `chooseCursor` handler, which calculates and clamps the cursor index before setting state. This made the interaction clearer and removed the syntax risk.

**How it was verified:** Installed frontend-only `framer-motion` and React Router 6 compatibility dependencies. Ran `npm run build` from `frontend/`; TypeScript and Vite completed successfully. Started Vite on port 5173, opened the landing page, navigated to the workspace, opened Circuit Designer, inserted an AND gate, and pressed Generate RTL. Browser developer logs showed no application errors. Two React Router v6 future-flag warnings were observed; they are informational and do not affect the build or runtime.

**Evidence:** `[HUMAN: capture docs/assets/codex-sessions/2026-07-21-circuit-designer-agentic-ui.png showing the palette, canvas, inspector, and generated RTL.]`

### 2026-07-21T12:05:21+05:30 — Added agent mission control, waveform controls, and cohesive motion system

**Task given to Codex:** “Visual Circuit Designer, AI Agent Copilot System, and a Full Frontend Glow-Up … Install and use framer-motion … agent activity timeline … Copilot chat dock … waveform viewer upgrade.”

**What Codex did:** Added `frontend/src/features/agents/AgentMissionControl.tsx` with visible Architect, RTL Engineer, Verification, Debug Agent, and Mentor roles; expandable role details; status chips; a progressive mission timeline; and a Mentor chat dock that clearly states that server-side AI is not configured while allowing the deterministic design path to remain usable. Added `frontend/src/features/waveform/WaveformPanel.tsx` with signal search, zoom controls, clickable time cursor behavior, SVG traces, bus values rendered in hexadecimal, and per-signal cursor readouts. Rebuilt `frontend/src/components/LandingPage.tsx` using Framer Motion reveal transitions, a silicon-grid backdrop, prompt-first CTA, interactive example prompts, and an engineering-loop section. Replaced the prior sparse `frontend/src/index.css` with a responsive dark silicon design system: glass-like technical panels, electric cyan semantic accents, focus rings, reduced-motion support, responsive collapse rules, active run states, and consistent typography/spacing. Updated `frontend/src/App.tsx` to route only landing and the feature-based workspace.

**Problems hit & how Codex solved them:** The original project declared React Router 7 but used the React Router 6 API (`Route`, `Routes`, `BrowserRouter`, and `useNavigate`). Codex changed the frontend dependency to the compatible React Router 6 release before building. The existing UI had only a static graph and a waveform placeholder; the new components were isolated into feature folders so the workspace shell stays small and future backend wiring does not require another monolithic rewrite.

**How it was verified:** `npm run build` passed after the dependency correction and waveform handler fix. Browser inspection verified the new landing page, workspace tab navigation, agent roster, component palette, React Flow canvas, custom node handles, and Circuit Designer controls. The production bundle is 549.97 kB before gzip and Vite reports a chunk-size advisory; this is a performance follow-up, not a build failure.

**Evidence:** `[HUMAN: capture docs/assets/codex-sessions/2026-07-21-landing-motion-workspace.png showing the new landing page and Agent Mission Control.]`

### 2026-07-21T12:05:21+05:30 — Added one-command Docker Compose delivery

**Task given to Codex:** “what about docker compose”.

**What Codex did:** Added the root `docker-compose.yml` with three named services: the static production frontend on port 3000, the Node API on port 8080, and PostgreSQL 16 with a durable named volume and health check. Added a multi-stage `frontend/Dockerfile` that uses `npm ci`, creates the Vite production bundle, and serves it through Nginx. The accompanying `frontend/nginx.conf` falls back to `index.html` so the client-side `/workspace` route still loads after a refresh. Updated the frontend README with the exact `docker compose up --build` command and local endpoints.

**Why this approach:** The existing backend Dockerfile already expects the repository root as its build context. Compose preserves that contract, waits for PostgreSQL to become healthy before starting the API, and avoids adding application or persistence logic to the backend skeleton. The database environment is ready for the backend to adopt when persistence is implemented.

**How it was verified:** Ran `docker compose config --quiet` to validate the Compose schema, service references, health dependency, and volume declaration. Attempted `docker compose build`, but the local Docker daemon was unavailable at `unix:///Users/kanhaiya_mehta/.docker/run/docker.sock`; therefore a full image build/run is still a required final local verification step after Docker Desktop is started.

**Evidence:** `[HUMAN: capture docs/assets/codex-sessions/2026-07-21-docker-compose.png showing docker compose up --build and the frontend/API health endpoint.]`

## 4. Feature ledger

| Feature | Implementation files | Commit(s) | Judge quick test |
| --- | --- | --- | --- |
| Baseline landing and workspace | `frontend/src/components/LandingPage.tsx`, `frontend/src/App.tsx` | `62c1852` | Open `/`, enter a prompt, and open `/workspace`. |
| Circuit Designer | `frontend/src/features/designer/CircuitDesigner.tsx`, `designerStore.ts`, `netlistCompiler.ts` | `[Pending commit]` | Open Circuit Designer, add an AND gate, wire it, and select **Generate RTL**. |
| Agent mission control | `frontend/src/features/agents/AgentMissionControl.tsx`, `features/workspace/Workspace.tsx` | `[Pending commit]` | Open **Copilot** and inspect agent roles, timeline, and Mentor dock. |
| Interactive waveform workspace | `frontend/src/features/waveform/WaveformPanel.tsx` | `[Pending commit]` | Open **waveforms**, search a signal, zoom, and click the trace to move the cursor. |
| One-command stack | `docker-compose.yml`, `frontend/Dockerfile`, `frontend/nginx.conf` | `[Pending commit]` | Run `docker compose up --build`; open ports 3000 and 8080. |
| Persistent backend workflow | `backend/src/server.mjs`, `projects.mjs`, `simulations.mjs`, `db.mjs` | `[Pending commit]` | Create a project, save versioned source, restore a version, and call `/health`. |
| Azure structured generation and Mentor | `backend/src/generation.mjs`, `usage.mjs`, `migrations/002_ai_usage_events.sql`, `migrations/003_mentor_usage.sql` | `[Pending commit]` | Generate a design, open Mentor, then inspect project usage. |
| Isolated simulation and Auto-Fix | `backend/simulator-worker/server.mjs`, `backend/src/autofix.mjs`, `simulator-client.mjs` | `[Pending commit]` | Run a self-checking testbench, inspect VCD/logs, then repair a deliberately failing version. |
| FPGA export handoff | `backend/src/exports.mjs` | `[Pending commit]` | Open Project, choose a supported board, and create its artifact bundle. |

## 5. Architecture & decisions

The frontend is intentionally split into isolated feature folders, and the schematic compiler remains deterministic/client-side so visual circuit design still works without AI credentials. The implemented AI backend keeps all model calls, database access, simulation commands, and provider credentials on the server. Architecture/RTL generation, Mentor, and Auto-Fix use bounded structured context; an AI repair creates a new immutable design version rather than overwriting the prior version.

## 6. Judging narrative

The visible Circuit Designer, deterministic RTL path, agent mission control, editor, real waveform evidence, version history, Auto-Fix, Mentor, 3D-gates view, and FPGA export combine several normally separate EDA product surfaces. Codex accelerated the work by converting a minimal React skeleton and backend scaffold into a coherent, testable full-stack hardware workflow while retaining a deterministic visual-design path when AI is unavailable. Every claim in this log is tied to a file, command, API result, or commit; human-captured session and screenshot evidence remains marked before submission.

## Before submission

- [ ] Paste the featured Codex session ID.
- [ ] Capture `docs/assets/codex-sessions/2026-07-21-baseline-audit.png`.
- [ ] Capture `docs/assets/codex-sessions/2026-07-21-circuit-designer-agentic-ui.png`.
- [ ] Capture `docs/assets/codex-sessions/2026-07-21-landing-motion-workspace.png`.
- [ ] Capture `docs/assets/codex-sessions/2026-07-21-docker-compose.png`.
- [ ] Run `docker compose --env-file backend/.env up --build` and check `http://localhost:3000` and `http://localhost:8080/health`.
- [ ] Replace `[Pending commit]` entries after committing the frontend work.
- [ ] Confirm all feature-ledger paths and verification commands on the final branch.

## 7. Release-readiness audit

### 2026-07-21T12:54:26+05:30 — Revalidated the monorepo and restored the frontend-to-API contract

**Task given to Codex:** “start from start check and understand the code base first and initialize it for pushing into github … check everything is perfect or not.” The user explicitly retained control of branch creation, commits, and pushes.

**What Codex did:** Re-read the root workspace scripts, architecture boundary, Docker Compose file, frontend package configuration, shared contracts, API routes, recent commit history, and the complete uncommitted diff. It restored the `@silicon-canvas/shared` client contract in `frontend/src/api/client.ts` and added `saveDesignFile`, which sends RTL and serialized `schematic.json` data through the existing active-version `PUT /api/projects/:projectId/versions/:versionId/files/:path` endpoint. `frontend/src/store/hardwareStore.ts` again tracks the active project, versioned files, and generation errors. `frontend/src/features/workspace/Workspace.tsx` now creates immutable versions before AI generation, opens the returned RTL, preserves a deterministic local fallback when the API or AI configuration is unavailable, saves designer output to the active version, and runs the existing simulation endpoint when `R` is pressed. The frontend manifest once again participates in the root workspace, its TypeScript project resolves `packages/shared`, and its `check` script type-checks the actual build references. The Docker frontend build now installs from the root lockfile and builds the named frontend workspace; Compose maps the Nginx container's port 80 to the documented host port 3000. The example frontend environment file contains only `VITE_API_BASE_URL`; no model credential is exposed to browser code.

**Problems hit & how Codex solved them:** The initial root `npm run check` skipped frontend TypeScript because the rewritten manifest removed its `check` script. After restoring the API client, `npm run build` reported `TS2307: Cannot find module '@silicon-canvas/shared/contracts'`; Codex added the monorepo aliases to `frontend/tsconfig.app.json` and changed the frontend check to `tsc -b --pretty false`. The original Docker configuration mapped host port 3000 to container port 3000 even though the production Nginx image listens on port 80; this is now `3000:80`. Browser visual verification was attempted but the enterprise browser policy rejected access to the local `127.0.0.1:5175` development server, so browser interaction was not retried through another route. A production dependency audit has no high or critical findings but still reports one moderate and one low finding in the latest `monaco-editor@0.56.0` transitive exact dependency on `dompurify@3.4.8`; the package's current release still pins that exact version, so there is no compatible package-manager-only remediation at this time.

**How it was verified:** Ran `npm run check` at repository root (frontend TypeScript build references and all backend syntax checks pass), `npm run build` in `frontend/` (Vite production build passes), `docker compose config --quiet`, `git diff --check`, frontend and root lockfile synchronization via `npm install --package-lock-only --ignore-scripts`, and `npm audit --omit=dev --json`. The production bundle is 553.36 kB before gzip; Vite emits its non-blocking chunk-size advisory.

**Evidence:** Working tree remains intentionally uncommitted on `main`; `git diff --check` passes. Do not commit or push until the human creates the desired branch. `[HUMAN: capture docs/assets/codex-sessions/2026-07-21-release-readiness.png showing a successful npm run check, frontend build, and docker compose config.]`

## 8. Backend delivery and end-to-end product integration

### 2026-07-21T15:41:02+05:30 — Built and verified the persistent AI-assisted hardware backend

**Task given to Codex:** The user asked to build and explain the backend, connect Azure OpenAI through environment variables, make generation/simulation reliable, test the entire project with 50 cases, and then expose the backend capabilities in the updated workspace UI.

**Goal:** Turn the original API skeleton into a safe, persistent hardware-design workflow: project creation, immutable versions, Azure-backed design generation, isolated simulation, waveform evidence, AI repair, token tracking, Mentor explanations, and FPGA handoff artifacts. The browser must use only the API; no model key, database credential, or simulator command is exposed to frontend code.

**What Codex did:**

1. **Created the persistent project model.** Implemented PostgreSQL-backed projects, active versions, version-owned files, simulation runs, Auto-Fix attempts, export jobs, and AI usage events. `backend/src/projects.mjs` ensures each generation, restore, or repair produces a new numbered version instead of overwriting historical source. `restoreProjectVersion` copies the selected version into a fresh active version.

2. **Added controlled AI generation.** `backend/src/generation.mjs` accepts Azure OpenAI credentials through `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, and `AZURE_OPENAI_DEPLOYMENT_NAME`; it also supports an OpenAI API fallback but deliberately rejects mixed provider configuration. A Generate action makes two structured JSON calls: first a hardware architecture (`designName`, modules, connections, verification plan), then an Icarus-compatible RTL/testbench bundle. File paths, size, required kinds, and unsupported simulator constructs are validated on the server before persistence.

3. **Implemented versioned source editing and simulation.** The API supports active-version file upserts for RTL, testbench, script, constraints, and README files. A simulation always reads the exact files from the requested version and delegates to the private simulator container. The worker writes only to a temporary directory, compiles with `iverilog -g2012`, runs `vvp`, returns bounded logs/summary/VCD data, and removes the temporary directory afterward.

4. **Added VCD evidence and simulation safety.** The simulator adds a small dump module so successful simulations return a real `simulation.vcd`. Input file count, source size, file paths, output size, VCD size, and process time are bounded. Traversal paths and dangerous filesystem-related Verilog system tasks (`$fopen`, `$fread`, `$fwrite`, `$readmem*`, `$system`, and related tasks) are rejected. A rejected unsafe design now returns `400 UNSAFE_SYSTEM_TASK`, not a misleading simulator-outage error.

5. **Implemented verification-gated Auto-Fix.** For a failed active-version simulation, `backend/src/autofix.mjs` builds a bounded repair context from source, logs, VCD, and run summary. The model returns a diagnosis and only changed RTL/testbench files. The backend clones the version, applies the patch, reruns Icarus, stores the repair attempt, and reports `applied` only when the fresh rerun passes. The original failed version remains preserved.

6. **Added auditable AI usage.** Migration `002_ai_usage_events.sql` records provider-reported input, output, and total tokens for architecture, RTL, and Auto-Fix calls; `GET /api/projects/:projectId/usage` returns events plus a per-project total. Migration execution is protected by a PostgreSQL advisory lock, preventing competing API instances from applying the same migration at startup.

7. **Added project-context Mentor.** `POST /api/projects/:projectId/mentor` sends only the active project prompt, stored architecture, and user question to the configured server-side model. It returns a concise explanation to the UI and records its token event as `mentor`. Migration `003_mentor_usage.sql` extends the AI-usage constraint safely for this fourth operation. A live Azure call explained the generated one-bit OR-gate fixture correctly; the model key remained only inside the API container.

8. **Added FPGA export artifacts.** `backend/src/exports.mjs` validates the board target (`icestick`, `icebreaker`, or `arty_a7`), selects saved RTL, creates constraints, build script, and README artifacts, and persists them in an export job. The JSONB persistence bug caused by passing a JavaScript array directly to PostgreSQL was corrected by serializing the artifact list explicitly.

9. **Connected the backend to the rebuilt workspace.** `frontend/src/api/client.ts` now wraps project, version, file-save, simulation, Auto-Fix, usage, Mentor, and export endpoints. The workspace restores the last project from local storage, reloads its active-version files, autosaves RTL edits, saves dirty RTL before simulation, displays real VCD data/logs, presents version restore and token usage controls, opens architecture and 3D RTL-gates views, and surfaces Auto-Fix only for failed runs. This integration changes no backend trust boundary: all credentials remain server-side.

**Backend capability ledger:**

| Capability | Primary backend files | API / runtime proof |
| --- | --- | --- |
| Configuration and health | `backend/src/config.mjs`, `backend/src/server.mjs` | `GET /health` verifies PostgreSQL connectivity. |
| Migrations and persistence | `backend/src/db.mjs`, `backend/migrations/001_initial_schema.sql` | Ordered migrations recorded in `schema_migrations`. |
| Projects, files, versions, restore | `backend/src/projects.mjs` | Project/version/file routes; restore creates a new version. |
| Architecture + RTL generation | `backend/src/generation.mjs` | `POST /api/projects/:projectId/generate`; two schema-constrained model calls. |
| Version simulation and VCD | `backend/src/simulations.mjs`, `backend/src/simulator-client.mjs`, `backend/simulator-worker/server.mjs` | `POST /simulate`; persisted logs, summary, and VCD. |
| Safe simulation rejection | `backend/src/simulator-client.mjs`, `backend/simulator-worker/server.mjs` | Unsafe source returns structured `400 UNSAFE_SYSTEM_TASK`. |
| Auto-Fix and verified repair | `backend/src/autofix.mjs`, `backend/src/simulations.mjs` | Failed active run creates a separate patched/rerun version. |
| AI usage and token totals | `backend/src/usage.mjs`, `backend/migrations/002_ai_usage_events.sql` | `GET /usage`; provider-reported events and totals. |
| Project-context Mentor | `backend/src/generation.mjs`, `backend/src/server.mjs`, `backend/migrations/003_mentor_usage.sql` | `POST /mentor`; answer and `mentor` usage event verified live. |
| FPGA handoff artifacts | `backend/src/exports.mjs` | `POST /exports`; persisted board-specific artifact bundle. |

**Problems hit & how Codex solved them:**

- PostgreSQL treats a JavaScript array parameter as a PostgreSQL array, not JSONB. FPGA export artifacts therefore failed to persist. The export and Auto-Fix JSON payloads are now explicitly serialized before insertion.
- An invalid file `kind` reached the database check constraint and exposed a `500` response. Server-side allow-list validation now returns `400 INVALID_FILE_KIND` before PostgreSQL is called.
- The simulator worker correctly rejected unsafe Verilog, but the API client mapped every non-2xx worker response to `502 SIMULATOR_UNAVAILABLE`. The client now preserves worker-originated 4xx validation codes, so user source errors and infrastructure faults are distinguishable.
- The first new workspace displayed static waveform examples even after real simulation. The waveform feature now parses the persisted VCD with `@silicon-canvas/vcd-core`, presents actual signal values, filtering, zoom, cursor inspection, and the simulator log.
- Normal Monaco edits originally lived only in client state. The workspace now autosaves after a short debounce, exposes Save, and saves dirty RTL before running simulation. The active project identifier is stored locally and its current files reload after refresh.
- Circuit Designer used an internal net name in declarations but an instance label at the output assignment. Its compiler now consistently resolves component output signals to the declared generated net.

**How it was verified:**

- Built and started the complete production stack repeatedly with `docker compose --env-file backend/.env up --build -d`.
- Confirmed API/DB health with `GET /health`; API, DB, simulator, and web services were running.
- Ran `npm run check` in the API container and production `tsc -b && vite build` in the frontend Docker build.
- Applied and confirmed migrations `001_initial_schema.sql`, `002_ai_usage_events.sql`, and `003_mentor_usage.sql`.
- Exercised project creation, Azure generation, saved RTL/testbench retrieval, successful/failing Icarus simulation, VCD storage, Auto-Fix repair/rerun, immutable version restore, supported/unsupported FPGA export, invalid file-kind validation, unsafe-source rejection, active-project refresh, and Mentor answers. The QA matrix is maintained in `docs/QA_50_TEST_CASES.md`.
- Verified a real Mentor request against the generated `persistence_live_qa` project. It accurately described the one-bit OR gate and its self-checking testbench; the newest usage event was `mentor`.

**Evidence:** `docs/BACKEND_IMPLEMENTATION.md` contains the detailed backend reference; `docs/QA_50_TEST_CASES.md` contains the 50-case matrix. `[HUMAN: capture docs/assets/codex-sessions/2026-07-21-backend-live-flow.png showing the Docker services, health response, generated project, a simulation waveform/log, version history, and Mentor reply.]`

### Backend judging narrative

The backend is not a prompt-to-code demo endpoint. It is a versioned hardware-workflow service: structured AI output becomes persisted architecture and source, exact version files are compiled in an isolated Icarus worker, evidence returns as logs and VCD, and AI repair is accepted only after a separate version passes verification. Usage events provide an auditable model-call trail, Mentor explanations are context-bound and server-side, and FPGA export produces reproducible handoff artifacts. These boundaries make the prototype understandable to an evaluator and provide a credible path from a hackathon demo toward a multi-user engineering tool.

### Backend follow-ups after the current implementation

1. Add authentication, ownership, quotas, and rate limits before any public deployment.
2. Move long generation, simulation, and export work to a durable queued-job system with progress and cancellation.
3. Add a human review/diff approval step before an Auto-Fix version becomes active.
4. Add real vendor toolchain execution only if the product must produce a programmed FPGA, rather than the current reproducible export bundle.
