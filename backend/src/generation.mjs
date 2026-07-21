import { config } from "./config.mjs";

const architectureSchema = {
  type: "object",
  additionalProperties: false,
  required: ["designName", "summary", "modules", "connections", "verificationPlan"],
  properties: {
    designName: { type: "string" },
    summary: { type: "string" },
    modules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "purpose", "inputs", "outputs"],
        properties: {
          name: { type: "string" }, purpose: { type: "string" },
          inputs: { type: "array", items: { type: "string" } },
          outputs: { type: "array", items: { type: "string" } },
        },
      },
    },
    connections: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["from", "to", "signal"],
        properties: { from: { type: "string" }, to: { type: "string" }, signal: { type: "string" } },
      },
    },
    verificationPlan: { type: "array", items: { type: "string" } },
  },
};

const rtlSchema = {
  type: "object",
  additionalProperties: false,
  required: ["files"],
  properties: {
    files: {
      type: "array",
      minItems: 2,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
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

function modelOutputText(response) {
  const text = response.output
    ?.filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text)
    .join("");
  if (!text) throw new Error("The generation model returned no usable text.");
  return text;
}

export function resolveResponsesEndpoint() {
  const azureValues = [config.azureOpenaiApiKey, config.azureOpenaiEndpoint, config.azureOpenaiDeploymentName];
  const azureConfigured = azureValues.every(Boolean);
  const azurePartiallyConfigured = azureValues.some(Boolean);
  if (azurePartiallyConfigured && !azureConfigured) {
    const error = new Error("AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT_NAME must be set together.");
    error.statusCode = 503;
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }
  if (azureConfigured && config.openaiApiKey) {
    const error = new Error("Configure either Azure OpenAI credentials or OPENAI_API_KEY, not both.");
    error.statusCode = 503;
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }
  if (azureConfigured) {
    const baseUrl = config.azureOpenaiEndpoint.replace(/\/$/, "").replace(/\/openai\/v1$/, "");
    const deployment = config.azureOpenaiDeploymentName;
    const url = `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=2025-04-01-preview`;
    return { url, headers: { "api-key": config.azureOpenaiApiKey }, provider: "azure" };
  }
  if (config.openaiApiKey) {
    return { url: "https://api.openai.com/v1/chat/completions", headers: { Authorization: `Bearer ${config.openaiApiKey}` }, provider: "openai" };
  }
  const error = new Error("Set Azure OpenAI or OpenAI server credentials to use the Silicon Canvas AI workflow.");
  error.statusCode = 503;
  error.code = "AI_NOT_CONFIGURED";
  throw error;
}

export async function requestStructuredModel({ model, schemaName, schema, instructions, input }) {
  const endpoint = resolveResponsesEndpoint();
  const body = {
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: input },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: schemaName, strict: true, schema },
    },
  };
  // For Azure, model is specified via deployment URL; for OpenAI, pass model field
  if (endpoint.provider === "openai") body.model = model;
  const response = await fetch(endpoint.url, {
    method: "POST",
    headers: { ...endpoint.headers, "content-type": "application/json" },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.error?.message ?? "The generation model request failed.");
    error.statusCode = 502;
    error.code = "AI_REQUEST_FAILED";
    throw error;
  }
  const text = payload.choices?.[0]?.message?.content;
  if (!text) throw new Error("The generation model returned no usable text.");
  try {
    return {
      data: JSON.parse(text),
      provider: endpoint.provider,
      model,
      usage: normalizeUsage(payload.usage),
    };
  } catch (cause) {
    const error = new Error("The generation model returned invalid structured data.");
    error.statusCode = 502;
    error.code = "AI_INVALID_OUTPUT";
    error.cause = cause;
    throw error;
  }
}

function normalizeUsage(usage) {
  const safeTokenCount = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
  return {
    inputTokens: safeTokenCount(usage?.prompt_tokens),
    outputTokens: safeTokenCount(usage?.completion_tokens),
    totalTokens: safeTokenCount(usage?.total_tokens),
  };
}

function validateFiles(files) {
  const allowedPath = /^[A-Za-z0-9_./-]+\.(?:v|sv)$/;
  for (const file of files) {
    if (!allowedPath.test(file.path) || file.path.includes("..") || file.content.length > 500_000) {
      const error = new Error("The generation model returned an invalid RTL file.");
      error.statusCode = 502;
      error.code = "AI_INVALID_OUTPUT";
      throw error;
    }
  }
  if (!files.some((file) => file.kind === "rtl") || !files.some((file) => file.kind === "testbench")) {
    const error = new Error("Generation must include at least one RTL file and one testbench.");
    error.statusCode = 502;
    error.code = "AI_INVALID_OUTPUT";
    throw error;
  }
  const unsupported = files.find((file) => /\binside\s*\{|\bunique(?:0)?\s+(?:case|if)\b|\bpriority\s+(?:case|if)\b|\b(?:rand|randc)\b|\bclass\b/.test(file.content));
  if (unsupported) {
    const error = new Error(`Generated ${unsupported.path} uses SystemVerilog features unsupported by the Icarus simulator. Generate again to receive an Icarus-compatible testbench.`);
    error.statusCode = 502;
    error.code = "AI_INVALID_OUTPUT";
    throw error;
  }
}

export async function generateHardwareDesign(prompt, { onUsage } = {}) {
  const architectureResponse = await requestStructuredModel({
    model: config.architectModel,
    schemaName: "hardware_architecture",
    schema: architectureSchema,
    instructions: "You are the Silicon Canvas hardware architect. Produce a concise, synthesizable-SystemVerilog-ready microarchitecture. Do not include implementation code; return only the requested JSON schema.",
    input: `Design request:\n${prompt}`,
  });
  await onUsage?.({ operation: "architecture", ...architectureResponse });
  const architecture = architectureResponse.data;

  const implementationResponse = await requestStructuredModel({
    model: config.rtlModel,
    schemaName: "hardware_rtl_bundle",
    schema: rtlSchema,
    instructions: "You are the Silicon Canvas RTL engineer. Produce synthesizable Verilog/SystemVerilog and a self-checking testbench from the architecture. The bundle must compile with Icarus Verilog using `iverilog -g2012`. Use a conservative Verilog/SystemVerilog subset: do not use `inside`, `unique`, `priority`, classes, randomization, queues, dynamic arrays, covergroups, constraints, interfaces, packages, DPI, or UVM. In testbenches, express checks with `if (...) begin $display(...); $fatal; end` rather than SystemVerilog assertions or `inside` membership tests. For an N-bit signed add, calculate expected overflow using `(a[N-1] == b[N-1]) && (result[N-1] != a[N-1])`; for subtraction use `(a[N-1] != b[N-1]) && (result[N-1] != a[N-1])`. Do not compare an unbounded integer result to zero to determine finite-width signed overflow. Use no Markdown fences. Include a self-checking test for each verification-plan item. Return only the requested JSON schema.",
    input: `User request:\n${prompt}\n\nArchitecture specification:\n${JSON.stringify(architecture)}`,
  });
  await onUsage?.({ operation: "rtl", ...implementationResponse });
  const implementation = implementationResponse.data;
  validateFiles(implementation.files);
  return { architecture, files: implementation.files };
}
