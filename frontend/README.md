# Silicon Canvas Frontend

The Silicon Canvas frontend is an agentic HDL design workspace built with React, TypeScript, Vite, Tailwind CSS, Zustand, Monaco Editor, React Flow, and Framer Motion.

## Features

- Motion-driven landing page with prompt-first entry and hardware examples.
- Workspace with RTL Studio, Circuit Designer, Waveforms, and Copilot tabs.
- Visual Circuit Designer with component palette, typed ports, connection validation, inspector, undo/redo, duplicate/delete, snap grid, and minimap.
- Deterministic client-side schematic-to-Verilog compiler that works without AI credentials.
- Visible Architect, RTL Engineer, Verification, Debug, and Mentor agent mission-control UI.
- Interactive waveform panel with zoom, signal search, time cursor, hexadecimal bus values, and readouts.

See the repository-level [CODX_BUILD_LOG.md](../CODX_BUILD_LOG.md) for the judge-facing build diary and verification record.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build, run `npm run build`.

## Run the complete stack with Docker

From the repository root, start the frontend, API, and PostgreSQL dependency together:

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000). The API health endpoint is available at [http://localhost:8080/health](http://localhost:8080/health). Stop the containers with `docker compose down`; add `--volumes` only when you also want to remove the local PostgreSQL data volume.
