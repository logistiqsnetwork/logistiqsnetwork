// Migration runner script — applies db/migrations/ against Neon
// Usage: bun run db/migrate.ts
import { runMigrations } from "~/lib/db";

console.log("[Migrate] Running migrations...");
const applied = await runMigrations();
if (applied.length === 0) {
  console.log("[Migrate] No new migrations to apply.");
} else {
  console.log(`[Migrate] Applied ${applied.length} migration(s): ${applied.join(", ")}`);
}
console.log("[Migrate] Done.");
