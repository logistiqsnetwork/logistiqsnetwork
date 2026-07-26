// API: /api/agents/campaigns — List campaigns (GET) + Create campaign (POST)
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/agents/campaigns")({
  GET: async ({ request }) => {
    try {
      const { getSql } = await import("~/lib/db");
      const sql = getSql();
      const url = new URL(request.url);
      const status = url.searchParams.get("status");

      let rows: any[];
      if (status) {
        rows = sql`
          SELECT * FROM agent_campaigns WHERE status = ${status}
          ORDER BY created_at DESC
        ` as any[];
      } else {
        rows = sql`
          SELECT * FROM agent_campaigns ORDER BY created_at DESC
        ` as any[];
      }

      // Parse JSON fields
      const campaigns = rows.map((r: any) => ({
        ...r,
        target_industries: safeJsonParse(r.target_industries, []),
        target_regions: safeJsonParse(r.target_regions, []),
      }));

      return Response.json({ campaigns });
    } catch (err) {
      console.error("[API] GET /api/agents/campaigns error:", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },

  POST: async ({ request }) => {
    try {
      const { getSql } = await import("~/lib/db");
      const sql = getSql();
      const body = await request.json();

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const name = body.name || "Untitled Campaign";
      const targetIndustries = JSON.stringify(body.target_industries || []);
      const targetRegions = JSON.stringify(body.target_regions || []);
      const prospectSource = body.prospect_source || "seed_list";
      const maxProspects = body.max_prospects || 50;
      const outreachTemplate = body.outreach_template || null;
      const scheduleCron = body.schedule_cron || null;
      const status = body.status || "draft";

      sql`
        INSERT INTO agent_campaigns (
          id, name, status,
          target_industries, target_regions,
          prospect_source, max_prospects,
          outreach_template, schedule_cron,
          notes, created_at, updated_at
        ) VALUES (
          ${id}, ${name}, ${status},
          ${targetIndustries}, ${targetRegions},
          ${prospectSource}, ${maxProspects},
          ${outreachTemplate}, ${scheduleCron},
          ${body.notes ?? null}, ${now}, ${now}
        )
      `;

      const rows = sql`SELECT * FROM agent_campaigns WHERE id = ${id}` as any[];
      const campaign = { ...rows[0], target_industries: safeJsonParse(rows[0].target_industries, []), target_regions: safeJsonParse(rows[0].target_regions, []) };

      return Response.json({ campaign }, { status: 201 });
    } catch (err) {
      console.error("[API] POST /api/agents/campaigns error:", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
});

function safeJsonParse(str: string | null, fallback: any): any {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}
