import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/agents/campaigns/$id/run")({
  POST: async () => Response.json({ status: "ok", domain: "agents", runId: crypto.randomUUID() }),
});
