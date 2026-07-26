import { Database } from "bun:sqlite";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * SQLite-backed session store.
 *
 * Sessions are stored in ~/.sessions.db (outside the site directory, not
 * committed). Bun's built-in SQLite provides sub-millisecond local lookups
 * for auth — keeping session data out of Neon saves latency on every request.
 *
 * The sessions table is auto-created on first use.
 */

const DB_PATH = join(homedir(), ".sessions.db");

let _db: Database | null = null;

function getDB(): Database {
  if (_db) return _db;
  _db = new Database(DB_PATH, { create: true });
  _db.run("PRAGMA journal_mode = WAL");
  _db.run("PRAGMA foreign_keys = ON");
  _db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )
  `);
  _db.run(`
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at)
  `);
  return _db;
}

export interface Session {
  id: string;
  userId: string;
  data: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

const DAY_MS = 86400_000;
const SESSION_TTL_MS = 7 * DAY_MS; // 7 days

export function createSession(userId: string, data: Record<string, unknown> = {}): Session {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  db.run(
    "INSERT INTO sessions (id, user_id, data, expires_at) VALUES (?, ?, ?, ?)",
    [id, userId, JSON.stringify(data), expiresAt.toISOString()],
  );

  return {
    id,
    userId,
    data,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export function getSession(sessionId: string): Session | null {
  const db = getDB();
  const row = db
    .query("SELECT id, user_id, data, created_at, expires_at FROM sessions WHERE id = ?")
    .get(sessionId) as
    | { id: string; user_id: string; data: string; created_at: string; expires_at: string }
    | undefined;

  if (!row) return null;

  // Check expiry
  if (new Date(row.expires_at) < new Date()) {
    deleteSession(sessionId);
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    data: JSON.parse(row.data),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export function deleteSession(sessionId: string): void {
  const db = getDB();
  db.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
}

/** Clean up expired sessions. Call periodically (e.g., on login). */
export function cleanExpiredSessions(): void {
  const db = getDB();
  db.run("DELETE FROM sessions WHERE expires_at < datetime('now')");
}

/** Get the cookie config for the session token. */
export function sessionCookie(value: string, maxAgeSeconds: number = SESSION_TTL_MS / 1000): string {
  return `session_id=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(): string {
  return "session_id=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}
