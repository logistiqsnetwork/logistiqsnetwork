import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/companies/$id")({
  GET: async () => Response.json({ status: "ok", domain: "companies" }),
  PATCH: async () => Response.json({ status: "ok", domain: "companies" }),
  DELETE: async () => Response.json({ status: "ok", domain: "companies" }),
});
