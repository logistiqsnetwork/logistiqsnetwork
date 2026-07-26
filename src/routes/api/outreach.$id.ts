import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/outreach/$id")({
  GET: async () => Response.json({ status: "ok", domain: "outreach" }),
  PATCH: async () => Response.json({ status: "ok", domain: "outreach" }),
  POST: async () => Response.json({ status: "ok", domain: "outreach" }),
});
