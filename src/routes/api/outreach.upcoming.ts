// API: /api/outreach/upcoming — Upcoming follow-ups (GET)
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/outreach/upcoming")({
  GET: async () => Response.json({ status: "ok", domain: "outreach" }),
});
