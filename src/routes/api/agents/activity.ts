// API: /api/agents/activity — Recent agent activity log (GET)
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/agents/activity")({
  GET: async () => Response.json({ status: "ok", domain: "agents" }),
});
