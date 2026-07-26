import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/auth/session")({
  GET: async ({ request }) => {
    const { getSession } = await import("~/lib/session-store");
    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/(?:^|;\s*)session_id=([^;]*)/);
    if (!match) return Response.json({ status: "ok", user: null });
    const session = getSession(match[1]);
    if (!session) return Response.json({ status: "ok", user: null });
    return Response.json({ status: "ok", user: { userId: session.userId, role: session.data.role } });
  },
});
