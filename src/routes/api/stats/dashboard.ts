// API: /api/stats/dashboard — Aggregated CRM dashboard numbers (GET)
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stats/dashboard")({
  GET: async () =>
    Response.json({
      status: "ok",
      domain: "stats",
      totalLoads: 0,
      openLoads: 0,
      totalCompanies: 0,
      prospectsByStage: {},
      outreachPending: 0,
      recentActivity: [],
    }),
});
