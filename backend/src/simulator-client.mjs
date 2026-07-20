import { config } from "./config.mjs";

export async function runWithSimulator(files) {
  const response = await fetch(`${config.simulatorUrl.replace(/\/$/, "")}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({ files: files.map(({ path, kind, content }) => ({ path, kind, content })) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error ?? "The simulation worker rejected the design.");
    error.statusCode = 502;
    error.code = "SIMULATOR_UNAVAILABLE";
    throw error;
  }
  return result;
}
