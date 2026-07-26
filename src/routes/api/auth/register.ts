import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/register")({
  POST: async ({ request }) => {
    const { getSql } = await import("~/lib/db");
    const { createSession, sessionCookie, cleanExpiredSessions } = await import("~/lib/session-store");

    cleanExpiredSessions();
    let body: any;
    try { body = await request.json(); } catch { return Response.json({ status: "error", error: "Invalid JSON" }, { status: 400 }); }
    const { email, password, role, displayName, companyName } = body;
    if (!email || !password || !role || !displayName) return Response.json({ status: "error", error: "Missing required fields" }, { status: 400 });
    if (role !== "shipper" && role !== "carrier") return Response.json({ status: "error", error: "Invalid role" }, { status: 400 });

    const passwordHash = await Bun.password.hash(password, { algorithm: "bcrypt" });
    try {
      const sql = getSql();
      const rows = await sql`INSERT INTO users (email, password_hash, role, display_name, company_name) VALUES (${email}, ${passwordHash}, ${role}, ${displayName}, ${companyName ?? null}) RETURNING id, email, role, display_name, company_name, created_at`;
      const user = rows[0];
      const session = createSession(user.id, { role: user.role, displayName: user.display_name });
      return new Response(JSON.stringify({ status: "ok", user: { id: user.id, email: user.email, role: user.role, displayName: user.display_name, companyName: user.company_name, createdAt: String(user.created_at) } }), { status: 201, headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(session.id) } });
    } catch (err: any) {
      if (err.message?.includes("duplicate") || err.message?.includes("UNIQUE")) return Response.json({ status: "error", error: "Email already registered" }, { status: 409 });
      console.error("[Auth] Register error:", err);
      return Response.json({ status: "error", error: "Internal server error" }, { status: 500 });
    }
  },
});
