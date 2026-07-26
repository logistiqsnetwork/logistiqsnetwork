import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/contacts/$id")({
  GET: async () => Response.json({ status: "ok", domain: "contacts" }),
  PATCH: async () => Response.json({ status: "ok", domain: "contacts" }),
  DELETE: async () => Response.json({ status: "ok", domain: "contacts" }),
});
