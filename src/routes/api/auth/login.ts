import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/auth/login")({
  POST: async ({ request }) => {
    const { getSql } = await import("~/lib/db");
    const { createSession, sessionCookie, cleanExpiredSessions } = await import("~/lib/session-store");
    cleanExpiredSessions();
    let body: any;
    try { body = await request.json(); } catch { return Response.json({ status: "error", error: "Invalid JSON" }, { status: 400 }); }
    const { email, password } = body;
    if (!email || !password) return Response.json({ status: "error", error: "Email and password required" }, { status: 400 });
    const sql = getSql();
    const rows = await sql`SELECT id, email, password_hash, role, display_name, company_name FROM users WHERE email = ${email}`;
    if (rows.length === 0) return Response.json({ status: "error", error: "Invalid email or password" }, { status: 401 });
    const user = rows[0];
    const valid = await Bun.password.verify(password, user.password_hash, "bcrypt");
    if (!valid) return Response.json({ status: "error", error: "Invalid email or password" }, { status: 401 });
    const session = createSession(user.id, { role: user.role, displayName: user.display_name });
    return new Response(JSON.stringify({ status: "ok", user: { id: user.id, email: user.email, role: user.role, displayName: user.display_name, companyName: user.company_name } }), { status: 200, headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(session.id) } });
  },
});
