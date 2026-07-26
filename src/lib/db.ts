import { Database } from "bun:sqlite";
import { readFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * SQLite-backed database for the LOGISTIQS NETWORK MVP.
 *
 * Uses Bun's built-in SQLite — no external credentials needed.
 * Migratable to Neon/Postgres later when the proper connection string is available.
 *
 * Usage inside server functions / API routes:
 *
 *   const rows = getSql()`select id, name from companies`;
 */

const DB_PATH = join(process.cwd(), "data", "logistiqs.db");

let _db: Database | null = null;

function getDb(): Database {
  if (_db) return _db;
  // Ensure data directory exists
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  _db = new Database(DB_PATH);
  _db.exec("PRAGMA journal_mode=WAL");
  _db.exec("PRAGMA foreign_keys=ON");
  return _db;
}

/** Tagged template SQL function — works like neon() */
export function getSql() {
  const db = getDb();

  function sql(strings: TemplateStringsArray, ...values: unknown[]): any[] {
    // Build query with placeholders
    let text = strings[0];
    const params: unknown[] = [];
    for (let i = 0; i < values.length; i++) {
      params.push(values[i]);
      text += "?" + strings[i + 1];
    }
    const stmt = db.prepare(text);
    // Determine if it's a SELECT-like query or a mutation
    const trimmed = text.trim().toUpperCase();
    if (
      trimmed.startsWith("SELECT") ||
      trimmed.startsWith("WITH") ||
      trimmed.startsWith("PRAGMA")
    ) {
      return stmt.all(...params) as any[];
    }
    // For INSERT/UPDATE/DELETE/CREATE/etc.
    stmt.run(...params);
    return [];
  }

  // unsafe() for raw SQL strings (used by migrations)
  sql.unsafe = (rawSql: string) => {
    const db = getDb();
    const trimmed = rawSql.trim().toUpperCase();
    if (
      trimmed.startsWith("SELECT") ||
      trimmed.startsWith("WITH") ||
      trimmed.startsWith("PRAGMA")
    ) {
      return db.prepare(rawSql).all() as any[];
    }
    db.exec(rawSql);
    return [];
  };

  return sql;
}

/**
 * Apply all pending migrations from db/migrations/.
 * Uses files with .sqlite.sql suffix for SQLite-specific DDL.
 * Falls back to .sql files if no .sqlite.sql exists.
 */
export async function runMigrations(): Promise<string[]> {
  const applied: string[] = [];
  try {
    const sql = getSql();
    const db = getDb();

    // Ensure schema_version table exists
    db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    const migrationsDir = join(process.cwd(), "db", "migrations");
    if (!existsSync(migrationsDir)) return applied;

    // Prefer .sqlite.sql files, fall back to .sql
    const allFiles = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sqlite.sql") || f.endsWith(".sql"));

    // If both .sqlite.sql and .sql exist for the same migration, prefer .sqlite.sql
    const sqliteVersions = new Set(allFiles.filter(f => f.endsWith(".sqlite.sql")));
    const files = allFiles
      .filter((f) => {
        if (f.endsWith(".sqlite.sql")) return true;
        // Only include .sql if no corresponding .sqlite.sql exists
        return !sqliteVersions.has(f.replace(".sql", ".sqlite.sql"));
      })
      .sort();

    for (const file of files) {
      const version = parseInt(file.split("_")[0], 10);
      if (isNaN(version)) continue;

      // Check if already applied
      const existing = db
        .prepare("SELECT version FROM schema_version WHERE version = ?")
        .get(version);
      if (existing) continue;

      const sqlText = readFileSync(join(migrationsDir, file), "utf8");
      sql.unsafe(sqlText);

      db.prepare(
        "INSERT INTO schema_version (version) VALUES (?)"
      ).run(version);

      applied.push(file);
      console.log(`[DB] Migration ${file} applied successfully.`);
    }
  } catch (err) {
    console.error("[DB] Migration error:", err);
  }
  return applied;
}

// Backward compatibility
export { getSql as sql };
