import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/agents/campaigns/$id/prospects")({
  GET: async () => Response.json({ status: "ok", domain: "agents" }),
});
