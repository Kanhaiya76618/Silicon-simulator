import { readFile, readdir } from "node:fs/promises";
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
  const sourceDirectory = dirname(fileURLToPath(import.meta.url));
  const migrationsDirectory = join(sourceDirectory, "..", "migrations");
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => /^\d+_[a-z0-9_]+\.sql$/i.test(file))
    .sort();

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query("SELECT pg_advisory_lock(hashtext('silicon_canvas_migrations'))");
    for (const name of migrationFiles) {
      const { rows } = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [name]);
      if (rows[0]) continue;

      const sql = await readFile(join(migrationsDirectory, name), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('silicon_canvas_migrations'))").catch(() => undefined);
    client.release();
  }
}

export async function closeDatabase() {
  await pool.end();
}
