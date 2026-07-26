// API: /api/outreach — List outreach records (GET) + Log outreach (POST)
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/outreach")({
  GET: async () => Response.json({ status: "ok", domain: "outreach" }),
  POST: async () => Response.json({ status: "ok", domain: "outreach" }),
});
