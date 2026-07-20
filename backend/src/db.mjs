import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.mjs";

const { Pool } = pg;
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export async function runMigrations() {
  const directory = dirname(fileURLToPath(import.meta.url));
  const migration = await readFile(join(directory, "..", "migrations", "001_initial_schema.sql"), "utf8");
  await pool.query(migration);
}

export async function closeDatabase() {
  await pool.end();
}
