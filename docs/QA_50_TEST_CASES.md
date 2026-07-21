# Silicon Canvas QA report — 50 test cases

Run date: 21 July 2026  
Scope: current Docker runtime and the newly updated frontend UI.  
This report is updated as fixes are verified against the running application.

## Result key

- **PASS** — verified in the running application/API.
- **FAIL** — verified broken or disconnected.
- **PARTIAL** — protection/flow works, but an important behavior or response is wrong.
- **NOT WIRED** — backend feature exists, but the new UI has no integration for it.

## 50 test cases

| ID | Area | Test / expected result | Result | Evidence |
| --- | --- | --- | --- | --- |
| TC-01 | Runtime | Docker services start and remain healthy. | PASS | API, DB, simulator and web containers were running. |
| TC-02 | API | `GET /health` confirms API and database. | PASS | Returned `200` with `database: connected`. |
| TC-03 | Database | Database migrations apply exactly once. | PASS | `001_initial_schema.sql` and `002_ai_usage_events.sql` recorded in `schema_migrations`. |
| TC-04 | Frontend | Production frontend build completes. | PASS | `docker compose build web` completed successfully. |
| TC-05 | Backend | JavaScript syntax checks complete. | PASS | `npm run check` in API container passed. |
| TC-06 | API | CORS preflight returns no-content success. | PASS | `OPTIONS /api/projects` returned `204`. |
| TC-07 | API | Unknown URL returns a structured 404. | PASS | `GET /not-found` returned `404`. |
| TC-08 | API | Malformed JSON request is rejected. | PASS | `POST /api/projects` with invalid JSON returned `400`. |
| TC-09 | API | Blank project prompt is rejected. | PASS | Missing `prompt` returned `400`. |
| TC-10 | API | Overlong project prompt is rejected. | PASS | 10,001-character prompt returned `400`. |
| TC-11 | API | Invalid project identifier is rejected cleanly. | PASS | Invalid UUID returned `400 INVALID_ID`. |
| TC-12 | API | Valid-but-missing project returns not found. | PASS | Unknown UUID returned `404 PROJECT_NOT_FOUND`. |
| TC-13 | Projects | A project and first version can be created. | PASS | QA fixture project was created through the API. |
| TC-14 | Generation | New UI can create a project and call Azure generation. | PASS | Minimal `qa_and` project generated from the browser UI. |
| TC-15 | Generation | Architecture, RTL and self-checking testbench persist. | PASS | `qa_and.sv` and `tb_qa_and.sv` were saved in version 1. |
| TC-16 | Generation | UI reflects completed generation. | PASS | UI showed `Version 1 ready` and success toast. |
| TC-17 | Usage | Generate records architecture and RTL token events. | PASS | Usage API returned two provider-reported events, total 1,634 tokens. |
| TC-18 | Versions | A new copied version can be created. | PASS | QA fixture created a copied version before failure testing. |
| TC-19 | Versions | Restoring an old version creates a fresh version. | PASS | Restore created version 4 rather than overwriting history. |
| TC-20 | Files | RTL and testbench files can be saved to active version. | PASS | Fixture RTL/testbench were saved and simulated. |
| TC-21 | Simulation | Valid Icarus design compiles and passes. | PASS | Inverter fixture returned `passed`. |
| TC-22 | Simulation | Passing simulation produces VCD data. | PASS | Stored summary had `vcdGenerated: true`. |
| TC-23 | Simulation | A failing self-checking testbench is detected. | PASS | Deliberately broken inverter returned `failed`. |
| TC-24 | Auto-Fix | Auto-Fix rejects a passed simulation. | PASS | Passed-run Auto-Fix request returned `409`. |
| TC-25 | Auto-Fix | Auto-Fix creates a repair version and reruns it. | PASS | Failed inverter repair was `applied`; rerun `passed`. |
| TC-26 | Usage | Auto-Fix records an AI usage event. | PASS | QA fixture usage returned one Auto-Fix provider event. |
| TC-27 | FPGA export | Unsupported board is rejected clearly. | PASS | Invalid board returned `400`. |
| TC-28 | FPGA export | Supported-board artifact bundle is created and persisted. | PASS (fixed) | `icestick` now returns a completed export with `.pcf`, `build.sh` and `README.md`. |
| TC-29 | Simulator safety | Dangerous Verilog filesystem system task is blocked. | PASS (fixed) | Unsafe `$fopen` now returns `400 UNSAFE_SYSTEM_TASK`; the API no longer mislabels a rejected design as a simulator outage. |
| TC-30 | File validation | Invalid file kind returns client validation error. | PASS (fixed) | Invalid `kind` now returns `400 INVALID_FILE_KIND` before reaching PostgreSQL. |
| TC-31 | Landing page | New landing page renders with clear product story. | PASS | Verified at `/` in browser. |
| TC-32 | Navigation | Landing CTA opens the workspace. | PASS | `Start designing` navigated to `/workspace`. |
| TC-33 | Workspace | Studio, Circuit Designer, Waveforms and Copilot tabs switch. | PASS | All four views rendered in browser. |
| TC-34 | Workspace | Generated RTL displays in Monaco editor. | PASS | Browser displayed generated `qa_and.sv` source. |
| TC-35 | Workspace state | Current project/files survive a browser refresh. | PASS (fixed) | Live `persistence_live_qa` test refreshed back to `Version 1 ready` with `persistence_live_qa.sv` restored from the API. |
| TC-36 | Source editing | Manual Monaco edit is saved before simulation. | PASS (fixed) | Monaco changes are autosaved after 750 ms; a visible Save action also persists the active RTL, and Simulate saves dirty RTL before starting. |
| TC-37 | Simulation UX | User can find and click a Run Simulation control. | PASS (fixed) | Added visible `▶ Simulate` control; a real browser run completed successfully. |
| TC-38 | Simulation UX | Keyboard `R` runs current project simulation. | PASS | Actual `qa_and` run completed and opened Waveforms. |
| TC-39 | Waveforms | Signal filtering works. | PASS | In a real `waveform_qa` run, filtering `dut.y` reduced the view to 1 of 8 captured signals. |
| TC-40 | Waveforms | Zoom controls work. | PASS | Real VCD viewer zoom changed from 100% to 120%. |
| TC-41 | Waveforms | Viewer renders the latest stored VCD/project signals. | PASS (fixed) | Real run rendered 8 VCD signals including `waveform_qa_tb.a`, `.b`, `.y` and DUT signals. |
| TC-42 | Logs | Simulation logs are visible from the new UI. | PASS (fixed) | The real simulator log is available in the Waveforms panel as a disclosure section. |
| TC-43 | Circuit Designer | Palette adds blocks and Inspector exposes properties. | PASS | Added an AND gate; Inspector showed label and bus-width controls. |
| TC-44 | Circuit Designer | Generated RTL uses correct wires/nets. | PASS (fixed) | Component outputs now resolve to their generated nets, so the initial XOR emits `assign y = n_xor_1;`, matching its declared wire. |
| TC-45 | Architecture | AI-generated architecture is shown as a project graph. | PASS (fixed) | The Architecture tab now renders AI modules, inputs/outputs, signal map, and verification plan from `graphData`. |
| TC-46 | Agent UI | Agent cards expand to explain their role. | PASS | Architect card expanded and showed its output description. |
| TC-47 | Mentor | Mentor answers use the configured server-side model/context. | PASS (fixed) | Mentor now sends the active prompt and architecture to a server-side Azure call; a live answer for `persistence_live_qa` was returned and recorded as `mentor` token usage. |
| TC-48 | Auto-Fix UI | Failed simulation exposes an Auto-Fix action, repair status and diff/version. | PASS (fixed) | A failed Waveforms run now shows Auto-Fix & rerun; it calls the existing repair API and loads the new version plus rerun evidence. |
| TC-49 | Version/usage UI | Versions, restore controls and token usage are accessible in the UI. | PASS (fixed) | Project tab lists immutable versions, creates a restored version, and shows per-project AI token totals. |
| TC-50 | Product coverage | FPGA export, 3D RTL and generated-design architecture remain accessible after UI update. | PASS (fixed) | Architecture, FPGA export, and an interactive 3D RTL Gates view are available in the new workspace; the 3D view's topology and camera control were browser-verified. |

## Summary

- **Passed:** 50
- **Failed:** 0
- **Partial:** 0
- **Not wired:** 0
- **Total:** **50 test cases**.

## Current status

All 50 scoped test cases pass in the current Docker runtime. Future polish can focus on visual refinement, richer 3D gate semantics, and broader simulation test matrices rather than missing product functionality.

## Test fixture data created during QA

The audit created isolated `QA integration fixture` project versions for pass/fail simulation, Auto-Fix, restore and unsafe-source checks. Existing user projects were not modified.
