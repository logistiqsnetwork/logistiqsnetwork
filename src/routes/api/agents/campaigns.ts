// API: /api/agents/campaigns — List campaigns (GET) + Create campaign (POST)
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/agents/campaigns")({
  GET: async () => Response.json({ status: "ok", domain: "agents" }),
  POST: async () => Response.json({ status: "ok", domain: "agents" }),
});
