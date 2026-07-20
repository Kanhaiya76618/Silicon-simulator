import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const environmentFile = join(dirname(fileURLToPath(import.meta.url)), "..", ".env");
if (existsSync(environmentFile)) {
  for (const line of readFileSync(environmentFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const defaultDatabaseUrl = "postgresql://silicon:canvas@localhost:5432/silicon_canvas";

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
}

export const config = Object.freeze({
  port: numberFromEnv("PORT", 8080),
  databaseUrl: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  databaseSsl: process.env.DATABASE_SSL === "true",
  openaiApiKey: process.env.OPENAI_API_KEY,
  azureOpenaiApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenaiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  architectModel: process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? process.env.ARCHITECT_MODEL ?? "gpt-5.6",
  rtlModel: process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? process.env.RTL_MODEL ?? "gpt-5.6",
  simulatorUrl: process.env.SIMULATOR_URL ?? "http://simulator:8090",
});
