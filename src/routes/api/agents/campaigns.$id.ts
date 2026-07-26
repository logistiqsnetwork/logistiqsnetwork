// API: /api/agents/campaigns/$id — Get (GET) + Update (PATCH) single campaign
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/agents/campaigns/$id")({
  GET: async ({ request, params }) => {
    try {
      const { getSql } = await import("~/lib/db");
      const sql = getSql();
      const rows = sql`SELECT * FROM agent_campaigns WHERE id = ${params.id}` as any[];
      if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

      const c = rows[0];
      const campaign = {
        ...c,
        target_industries: safeJsonParse(c.target_industries, []),
        target_regions: safeJsonParse(c.target_regions, []),
      };

      // Fetch prospect summary
      const stats = sql`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('validated','company_created','contacted','converted') THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'duplicate' THEN 1 ELSE 0 END) as duplicates,
          SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted
        FROM agent_prospects WHERE campaign_id = ${params.id}
      ` as any[];

      return Response.json({ campaign, stats: stats[0] || {} });
    } catch (err) {
      console.error("[API] GET campaign error:", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },

  PATCH: async ({ request, params }) => {
    try {
      const { getSql } = await import("~/lib/db");
      const sql = getSql();
      const body = await request.json();
      const now = new Date().toISOString();

      // Build dynamic UPDATE
      const updates: string[] = [];
      const values: any[] = [];

      if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
      if (body.status !== undefined) { updates.push("status = ?"); values.push(body.status); }
      if (body.target_industries !== undefined) { updates.push("target_industries = ?"); values.push(JSON.stringify(body.target_industries)); }
      if (body.target_regions !== undefined) { updates.push("target_regions = ?"); values.push(JSON.stringify(body.target_regions)); }
      if (body.max_prospects !== undefined) { updates.push("max_prospects = ?"); values.push(body.max_prospects); }
      if (body.outreach_template !== undefined) { updates.push("outreach_template = ?"); values.push(body.outreach_template); }
      if (body.schedule_cron !== undefined) { updates.push("schedule_cron = ?"); values.push(body.schedule_cron); }
      if (body.notes !== undefined) { updates.push("notes = ?"); values.push(body.notes); }

      if (updates.length === 0) return Response.json({ error: "No fields to update" }, { status: 400 });

      updates.push("updated_at = ?");
      values.push(now);
      values.push(params.id);

      const { getDb } = await import("~/lib/db");
      // Use raw db.exec for dynamic SQL
      const db = (await import("~/lib/db")).getDb ? (await import("~/lib/db")).getDb() : null;
      // Fallback: use unsafe SQL
      const setClause = updates.join(", ");
      sql.unsafe(`UPDATE agent_campaigns SET ${setClause} WHERE id = '${params.id}'`);

      const rows = sql`SELECT * FROM agent_campaigns WHERE id = ${params.id}` as any[];
      const campaign = { ...rows[0], target_industries: safeJsonParse(rows[0].target_industries, []), target_regions: safeJsonParse(rows[0].target_regions, []) };

      return Response.json({ campaign });
    } catch (err) {
      console.error("[API] PATCH campaign error:", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
});

function safeJsonParse(str: string | null, fallback: any): any {
  try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
}
