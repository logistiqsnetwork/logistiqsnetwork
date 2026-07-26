// API: /api/loads — List loads (GET) + Create load (POST)
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/loads")({
  GET: async () => Response.json({ status: "ok", domain: "loads" }),
  POST: async () => Response.json({ status: "ok", domain: "loads" }),
});
