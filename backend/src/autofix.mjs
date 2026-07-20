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
  if (files.some((file) => !allowedPath.test(file.path) || file.path.includes("..") || file.content.length > 500_000)) {
    const error = new Error("The Auto-Fix model returned an invalid RTL file.");
    error.statusCode = 502;
    error.code = "AI_INVALID_OUTPUT";
    throw error;
  }
}

export async function createAutoFix(context) {
  const compactContext = {
    simulation: {
      summary: context.run.summary,
      logs: context.run.logs.slice(-20_000),
      vcdTail: context.run.vcdContent?.slice(-20_000) ?? null,
    },
    files: context.files.map((file) => ({ ...file, content: file.content.slice(0, 150_000) })),
  };
  const result = await requestStructuredModel({
    model: config.rtlModel,
    schemaName: "hardware_autofix",
    schema: fixSchema,
    instructions: "You are the Silicon Canvas RTL debugging engineer. Diagnose the failed self-checking simulation and return complete replacement content only for files that need a change. Preserve all unmodified files. Fix the underlying RTL or testbench bug; do not weaken assertions. Return only the requested JSON schema.",
    input: `Failed simulation context:\n${JSON.stringify(compactContext)}`,
  });
  validateFix(result.files);
  return result;
}
