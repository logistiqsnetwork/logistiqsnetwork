import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/loads/$id")({
  GET: async () => Response.json({ status: "ok", domain: "loads" }),
  PATCH: async () => Response.json({ status: "ok", domain: "loads" }),
  DELETE: async () => Response.json({ status: "ok", domain: "loads" }),
});
