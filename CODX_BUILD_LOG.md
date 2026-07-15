# Codex Build Log

## Featured session

**Session ID:** `[REPLACE_WITH_THE_SINGLE_COMPLEX_45_MINUTE_CODEX_SESSION_ID]`

This is the session to foreground in the submission. It should demonstrate Codex creating or debugging the core simulation, VCD, or Auto-Fix logic—not routine styling work.

## Diary entries

### [Date and time] — Verilator WASM browser bridge

**Problem:** `[Describe the string-to-WASM/stdout-to-VCD integration obstacle.]`

**Prompt given to Codex:**

> `[Paste the exact prompt and relevant error output.]`

**What Codex changed:** `[Name files and explain the generated glue code.]`

**Evidence:** `docs/assets/codex-sessions/[screenshot-file].png`

### [Date and time] — VCD waveform renderer

**Problem:** `[Describe the parser or Canvas performance obstacle.]`

**Prompt given to Codex:**

> `[Paste the exact prompt.]`

**What Codex changed:** `[Explain parser, viewport, zoom, scroll, or grouping work.]`

**Evidence:** `docs/assets/codex-sessions/[screenshot-file].png`

### [Date and time] — Auto-Fix feedback loop

**Problem:** `[Describe the failed simulation context that needed to reach the agent.]`

**Prompt given to Codex:**

> `[Paste the exact prompt.]`

**What Codex changed:** `[Explain failure capture, prompt packaging, streaming, and editor patching.]`

**Evidence:** `docs/assets/codex-sessions/[screenshot-file].png`

### [Date and time] — RISC-V branch-hazard fix

**Problem:** `[Describe the branch prediction failure and 1-cycle delay seen in VCD.]`

**Prompt given to Codex:**

> `[Paste the exact prompt plus selected VCD observations.]`

**What Codex changed:** `[Explain the forwarding/hazard patch and validation.]`

**Evidence:** `docs/assets/codex-sessions/[screenshot-file].png`

## Judging narrative

Building a browser-based HDL simulator, waveform renderer, and AI agent loop is ordinarily a multi-week engineering effort. Codex accelerated the Verilator WASM wrapper, the Canvas VCD renderer, the Auto-Fix feedback loop, and the pipelined RISC-V hardware demo. This log documents the concrete prompts, generated code, validation evidence, and the featured session behind those claims.

