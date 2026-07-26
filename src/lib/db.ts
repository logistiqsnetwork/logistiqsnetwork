import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Server-only handle to the Neon serverless Postgres database.
 *
 * `getSql()` resolves lazily — the site builds and serves even before a database
 * is connected. The error only surfaces if a query actually runs without
 * `DATABASE_URL`.
 *
 * Use inside a `createServerFn()` handler or an `src/routes/api/*` route:
 *
 *   const rows = await getSql()`select id, name from companies`;
 */
let _sql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — connect a database (via the database card) before running queries.",
    );
  }
  _sql = neon(url);
  return _sql;
}

/**
 * Apply all pending migrations from db/migrations/ against the Neon database.
 * Idempotent: tracks applied versions in the schema_version table.
 * Call once at server startup.
 */
export async function runMigrations(): Promise<string[]> {
  const applied: string[] = [];
  try {
    const sql = getSql();

    // Ensure schema_version table exists
    await sql`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Read migration files
    const migrationsDir = join(process.cwd(), "db", "migrations");
    let files: string[];
    try {
      const { readdirSync } = await import("node:fs");
      files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
    } catch {
      return applied; // no migrations dir — nothing to apply
    }

    for (const file of files) {
      const version = parseInt(file.split("_")[0], 10);
      if (isNaN(version)) continue;

      // Check if already applied
      const existing = await sql`
        SELECT version FROM schema_version WHERE version = ${version}
      `;
      if (existing.length > 0) continue;

      // Apply migration
      const sql_text = readFileSync(join(migrationsDir, file), "utf8");
      await sql.unsafe(sql_text);

      applied.push(file);
      console.log(`[DB] Migration ${file} applied successfully.`);
    }
  } catch (err) {
    console.error("[DB] Migration error:", err);
  }
  return applied;
}

// Re-export for backward compatibility (existing code using `import { sql } from "~/db"`)
// Deprecated: prefer getSql()
export { getSql as sql };
