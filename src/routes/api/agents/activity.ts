// API: /api/agents/activity — Recent agent activity log (GET)
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/agents/activity")({
  GET: async ({ request }) => {
    try {
      const { getSql } = await import("~/lib/db");
      const sql = getSql();
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get("limit") || "20");

      // Combine recent prospect discoveries and outreach drafts into a single activity feed
      const prospects = sql`
        SELECT
          'prospect_discovered' as event_type,
          ap.created_at as timestamp,
          ap.company_name_raw as entity_name,
          ap.industry,
          ap.region,
          ap.status,
          ac.name as campaign_name,
          ap.campaign_id,
          ap.id as entity_id
        FROM agent_prospects ap
        JOIN agent_campaigns ac ON ap.campaign_id = ac.id
        ORDER BY ap.created_at DESC
        LIMIT ${limit}
      ` as any[];

      const outreach = sql`
        SELECT
          'outreach_drafted' as event_type,
          o.created_at as timestamp,
          c.name as entity_name,
          o.subject,
          o.status,
          ac.name as campaign_name,
          o.agent_campaign_id as campaign_id,
          o.id as entity_id
        FROM outreach_records o
        JOIN companies c ON o.company_id = c.id
        LEFT JOIN agent_campaigns ac ON o.agent_campaign_id = ac.id
        WHERE o.agent_campaign_id IS NOT NULL
        ORDER BY o.created_at DESC
        LIMIT ${limit}
      ` as any[];

      // Merge and sort
      const all = [...prospects, ...outreach]
        .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))
        .slice(0, limit);

      return Response.json({ activity: all });
    } catch (err) {
      console.error("[API] GET activity error:", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
});
