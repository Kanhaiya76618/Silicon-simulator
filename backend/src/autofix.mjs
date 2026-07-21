import { config } from "./config.mjs";
import { requestStructuredModel } from "./generation.mjs";

const fixSchema = {
  type: "object",
  additionalProperties: false,
  required: ["diagnosis", "files"],
  properties: {
    diagnosis: { type: "string" },
    files: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "object", additionalProperties: false,
        required: ["path", "kind", "content"],
        properties: {
          path: { type: "string" },
          kind: { type: "string", enum: ["rtl", "testbench"] },
          content: { type: "string" },
        },
      },
    },
  },
};

function validateFix(files) {
  const allowedPath = /^[A-Za-z0-9_./-]+\.(?:v|sv)$/;
  if (files.some((file) => !allowedPath.test(file.path) || file.path.includes("..") || file.content.length > 500_000 || /\binside\s*\{|\bunique(?:0)?\s+(?:case|if)\b|\bpriority\s+(?:case|if)\b|\b(?:rand|randc)\b|\bclass\b/.test(file.content))) {
    const error = new Error("The Auto-Fix model returned an invalid RTL file.");
    error.statusCode = 502;
    error.code = "AI_INVALID_OUTPUT";
    throw error;
  }
}

export async function createAutoFix(context, { onUsage } = {}) {
  const compactContext = {
    simulation: {
      summary: context.run.summary,
      logs: context.run.logs.slice(-20_000),
      vcdTail: context.run.vcdContent?.slice(-20_000) ?? null,
    },
    files: context.files.map((file) => ({ ...file, content: file.content.slice(0, 150_000) })),
  };
  const response = await requestStructuredModel({
    model: config.rtlModel,
    schemaName: "hardware_autofix",
    schema: fixSchema,
    instructions: "You are the Silicon Canvas RTL debugging engineer. Diagnose the failed self-checking simulation and return complete replacement content only for files that need a change. Preserve all unmodified files. Fix the underlying RTL or testbench bug; do not weaken assertions. The repaired files must compile with Icarus Verilog using `iverilog -g2012`; use conservative Verilog/SystemVerilog only. Never use `inside`, `unique`, `priority`, classes, randomization, queues, dynamic arrays, covergroups, constraints, interfaces, packages, DPI, UVM, or SystemVerilog assertions. Express checks with `if (...) begin $display(...); $fatal; end`. For finite-width signed arithmetic, compute expected overflow from operand/result sign bits: add is `(a[N-1] == b[N-1]) && (result[N-1] != a[N-1])`; subtract is `(a[N-1] != b[N-1]) && (result[N-1] != a[N-1])`. Do not disable or weaken failing checks. Return only the requested JSON schema.",
    input: `Failed simulation context:\n${JSON.stringify(compactContext)}`,
  });
  await onUsage?.({ operation: "auto_fix", ...response });
  const result = response.data;
  validateFix(result.files);
  return result;
}
