/**
 * Auth guard for API routes and server functions.
 *
 * Reads the `session_id` cookie, looks up the session in SQLite,
 * and returns the authenticated user context or throws.
 * All session-store imports are dynamic to keep Node modules out of the client bundle.
 */

const COOKIE_RE = /(?:^|;\s*)session_id=([^;]*)/;

export interface AuthUser {
  userId: string;
  role: "shipper" | "carrier";
}

function getSessionId(req: Request): string | null {
  const cookie = req.headers.get("Cookie");
  if (!cookie) return null;
  const match = cookie.match(COOKIE_RE);
  return match ? match[1] : null;
}

export async function requireAuth(req: Request): Promise<AuthUser> {
  const { getSession } = await import("~/lib/session-store");
  const sessionId = getSessionId(req);
  if (!sessionId) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const session = getSession(sessionId);
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return {
    userId: session.userId,
    role: (session.data.role as "shipper" | "carrier") || "shipper",
  };
}

export async function requireRole(req: Request, role: "shipper" | "carrier"): Promise<AuthUser> {
  const user = await requireAuth(req);
  if (user.role !== role) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export async function optionalAuth(req: Request): Promise<AuthUser | null> {
  const { getSession } = await import("~/lib/session-store");
  const sessionId = getSessionId(req);
  if (!sessionId) return null;
  const session = getSession(sessionId);
  if (!session) return null;
  return {
    userId: session.userId,
    role: (session.data.role as "shipper" | "carrier") || "shipper",
  };
}
