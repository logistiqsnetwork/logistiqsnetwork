// API: /api/companies — List companies (GET) + Create company (POST)
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/companies")({
  GET: async () => Response.json({ status: "ok", domain: "companies" }),
  POST: async () => Response.json({ status: "ok", domain: "companies" }),
});
