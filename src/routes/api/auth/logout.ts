import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/auth/logout")({
  POST: async () => {
    const { clearSessionCookie } = await import("~/lib/session-store");
    return new Response(JSON.stringify({ status: "ok" }), { status: 200, headers: { "Content-Type": "application/json", "Set-Cookie": clearSessionCookie() } });
  },
});
