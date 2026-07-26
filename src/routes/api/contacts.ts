// API: /api/contacts — List contacts (GET) + Create contact (POST)
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/contacts")({
  GET: async () => Response.json({ status: "ok", domain: "contacts" }),
  POST: async () => Response.json({ status: "ok", domain: "contacts" }),
});
