import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/auth/session")({
  GET: async ({ request }) => {
    const { getSession } = await import("~/lib/session-store");
    const { getSql } = await import("~/lib/db");

    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/(?:^|;\s*)session_id=([^;]*)/);
    if (!match) return Response.json({ status: "ok", user: null });

    const session = getSession(match[1]);
    if (!session) return Response.json({ status: "ok", user: null });

    // Fetch full user info for display name
    const sql = getSql();
    const rows = sql`SELECT id, email, role, display_name, company_name FROM users WHERE id = ${session.userId}` as any[];
    if (rows.length === 0) return Response.json({ status: "ok", user: null });

    const u = rows[0];
    return Response.json({
      status: "ok",
      user: {
        userId: u.id,
        email: u.email,
        role: u.role,
        displayName: u.display_name,
        companyName: u.company_name,
      },
    });
  },
});
