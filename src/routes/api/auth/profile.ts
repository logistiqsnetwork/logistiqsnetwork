import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/auth/profile")({
  PATCH: async ({ request }) => {
    const { getSql } = await import("~/lib/db");
    const { getSession } = await import("~/lib/session-store");
    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/(?:^|;\s*)session_id=([^;]*)/);
    if (!match) return Response.json({ status: "error", error: "Unauthorized" }, { status: 401 });
    const session = getSession(match[1]);
    if (!session) return Response.json({ status: "error", error: "Unauthorized" }, { status: 401 });
    let body: any;
    try { body = await request.json(); } catch { return Response.json({ status: "error", error: "Invalid JSON" }, { status: 400 }); }
    const sql = getSql();
    const updates: string[] = []; const values: any[] = []; let i = 0;
    if (body.displayName) { i++; updates.push("display_name = $" + i); values.push(body.displayName); }
    if (body.companyName !== undefined) { i++; updates.push("company_name = $" + i); values.push(body.companyName); }
    if (body.companyId !== undefined) { i++; updates.push("company_id = $" + i); values.push(body.companyId); }
    if (updates.length === 0) return Response.json({ status: "error", error: "No fields to update" }, { status: 400 });
    i++; values.push(session.userId);
    const rows = await sql`UPDATE users SET ${sql.unsafe(updates.join(", "))}, updated_at = NOW() WHERE id = ${values[values.length - 1]} RETURNING id, email, role, display_name, company_name, company_id`;
    const u = rows[0];
    return Response.json({ status: "ok", user: { id: u.id, email: u.email, role: u.role, displayName: u.display_name, companyName: u.company_name, companyId: u.company_id } });
  },
});
