import { randomUUID } from "node:crypto";
import { pool } from "./db.mjs";

const boards = {
  icestick: {
    label: "IceStick FPGA",
    extension: "pcf",
    constraints: "# Map clk and generated design outputs to your IceStick pins.\n# set_io clk 21\n",
    nextPnr: "nextpnr-ice40 --hx1k --package tq144 --pcf silicon_canvas.pcf --json silicon_canvas.json --asc silicon_canvas.asc",
    pack: "icepack silicon_canvas.asc silicon_canvas.bin",
  },
  icebreaker: {
    label: "iCEBreaker",
    extension: "pcf",
    constraints: "# Map clk and generated design outputs to your iCEBreaker pins.\n# set_io clk 35\n",
    nextPnr: "nextpnr-ice40 --up5k --package sg48 --pcf silicon_canvas.pcf --json silicon_canvas.json --asc silicon_canvas.asc",
    pack: "icepack silicon_canvas.asc silicon_canvas.bin",
  },
  arty_a7: {
    label: "Arty A7",
    extension: "xdc",
    constraints: "# Add Arty A7 pin constraints for the generated top-level ports here.\n# set_property PACKAGE_PIN E3 [get_ports clk]\n",
    nextPnr: "# Use Vivado for Arty A7 implementation after Yosys synthesis.",
    pack: "# Run Vivado with silicon_canvas.xdc to create a bitstream.",
  },
};

function topModule(files) {
  const source = files.find((file) => file.kind === "rtl")?.content ?? "";
  return source.match(/\bmodule\s+([A-Za-z_][A-Za-z0-9_$]*)/)?.[1] ?? "top";
}

export async function createExportJob(projectId, versionId, board) {
  const boardConfig = boards[board];
  if (!boardConfig) return { error: "BOARD_NOT_SUPPORTED" };
  const { rows: version } = await pool.query(
    "SELECT id FROM design_versions WHERE project_id = $1 AND id = $2",
    [projectId, versionId],
  );
  if (!version[0]) return null;
  const { rows: files } = await pool.query(
    "SELECT path, kind, content FROM design_files WHERE version_id = $1 ORDER BY path",
    [versionId],
  );
  const rtlFiles = files.filter((file) => file.kind === "rtl");
  if (rtlFiles.length === 0) return { error: "RTL_FILES_REQUIRED" };
  const top = topModule(rtlFiles);
  const rtlPaths = rtlFiles.map((file) => file.path).join(" ");
  const artifacts = [
    { path: `silicon_canvas.${boardConfig.extension}`, content: boardConfig.constraints },
    {
      path: "build.sh",
      content: `#!/usr/bin/env sh\nset -eu\nyosys -p 'read_verilog ${rtlPaths}; synth -top ${top}; write_json silicon_canvas.json'\n${boardConfig.nextPnr}\n${boardConfig.pack}\n`,
    },
    {
      path: "README.md",
      content: `# Silicon Canvas FPGA export\n\nTarget board: ${boardConfig.label}\nTop module: \`${top}\`\n\nCopy the generated RTL files, this constraint file, and \`build.sh\` into one directory. Review and complete pin assignments before programming hardware.\n`,
    },
  ];
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO export_jobs (id, version_id, board, status, artifacts, completed_at)
     VALUES ($1, $2, $3, 'completed', $4, NOW()) RETURNING *`,
    [id, versionId, board, artifacts],
  );
  const row = rows[0];
  return { id: row.id, versionId: row.version_id, board: row.board, status: row.status, artifacts: row.artifacts, createdAt: row.created_at, completedAt: row.completed_at };
}
