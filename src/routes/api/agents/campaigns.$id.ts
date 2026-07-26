import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/agents/campaigns/$id")({
  GET: async () => Response.json({ status: "ok", domain: "agents" }),
  PATCH: async () => Response.json({ status: "ok", domain: "agents" }),
});
