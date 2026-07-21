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
    // The worker uses 4xx for an unsafe or invalid user design. Preserve that
    // distinction so the API never reports a healthy simulator as unavailable.
    error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    error.code = result.code ?? (error.statusCode === 400 ? "SIMULATION_INPUT_REJECTED" : "SIMULATOR_UNAVAILABLE");
    throw error;
  }
  return result;
}
