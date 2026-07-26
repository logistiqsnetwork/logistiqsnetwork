/**
 * Shared server functions for the LOGISTIQS NETWORK marketplace.
 *
 * Uses createServerFn from @tanstack/react-start for RPC-style
 * server-side logic that can be called from client components.
 */
import { createServerFn } from "@tanstack/react-start";

// ---------------------------------------------------------------------------
// Auth helper — reads session_id cookie within a server function
// ---------------------------------------------------------------------------
async function getSessionFromFn(): Promise<{
  userId: string;
  role: "shipper" | "carrier";
  displayName: string;
} | null> {
  const { getCookie } = await import("@tanstack/react-start/server");
  const sessionId = getCookie("session_id");
  if (!sessionId) return null;
  const { getSession } = await import("~/lib/session-store");
  const session = getSession(sessionId);
  if (!session) return null;
  const { getSql } = await import("~/lib/db");
  const sql = getSql();
  const rows = sql`SELECT id, email, role, display_name FROM users WHERE id = ${session.userId}` as any[];
  if (rows.length === 0) return null;
  const u = rows[0];
  return { userId: u.id, role: u.role as "shipper" | "carrier", displayName: u.display_name };
}

// ---------------------------------------------------------------------------
// getCurrentUser — call from any component to get the logged-in user
// ---------------------------------------------------------------------------
export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async () => {
    return getSessionFromFn();
  },
);

// ---------------------------------------------------------------------------
// Auth: register, login, logout (server functions with cookie management)
// ---------------------------------------------------------------------------

export const registerUser = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const body = d as {
      email: string;
      password: string;
      role: string;
      displayName: string;
      companyName?: string;
    };
    if (!body.email || !body.password || !body.role || !body.displayName) {
      throw new Error("Missing required fields");
    }
    if (body.role !== "shipper" && body.role !== "carrier") {
      throw new Error("Invalid role");
    }
    return body;
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("~/lib/db");
    const { createSession, sessionCookie, cleanExpiredSessions } = await import("~/lib/session-store");
    const { setCookie } = await import("@tanstack/react-start/server");

    cleanExpiredSessions();

    const passwordHash = await Bun.password.hash(data.password, { algorithm: "bcrypt" });
    try {
      const sql = getSql();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      sql`INSERT INTO users (id, email, password_hash, role, display_name, company_name, created_at, updated_at) VALUES (${id}, ${data.email}, ${passwordHash}, ${data.role}, ${data.displayName}, ${data.companyName ?? null}, ${now}, ${now})`;

      const rows = sql`SELECT id, email, role, display_name, company_name, created_at FROM users WHERE id = ${id}` as any[];
      const user = rows[0];

      const session = createSession(user.id, { role: user.role, displayName: user.display_name });
      setCookie("session_id", session.id, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 7 * 86400 });

      return {
        status: "ok",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          displayName: user.display_name,
          companyName: user.company_name,
        },
      };
    } catch (err: any) {
      if (err.message?.includes("UNIQUE") || err.message?.includes("duplicate")) {
        throw new Error("Email already registered");
      }
      console.error("[Auth] Register error:", err);
      throw new Error("Internal server error");
    }
  });

export const loginUser = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const body = d as { email: string; password: string };
    if (!body.email || !body.password) throw new Error("Email and password required");
    return body;
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("~/lib/db");
    const { createSession, cleanExpiredSessions } = await import("~/lib/session-store");
    const { setCookie } = await import("@tanstack/react-start/server");

    cleanExpiredSessions();

    const sql = getSql();
    const rows = sql`SELECT id, email, password_hash, role, display_name, company_name FROM users WHERE email = ${data.email}` as any[];
    if (rows.length === 0) throw new Error("Invalid email or password");

    const user = rows[0];
    const valid = await Bun.password.verify(data.password, user.password_hash, "bcrypt");
    if (!valid) throw new Error("Invalid email or password");

    const session = createSession(user.id, { role: user.role, displayName: user.display_name });
    setCookie("session_id", session.id, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 7 * 86400 });

    return {
      status: "ok",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
        companyName: user.company_name,
      },
    };
  });

export const logoutUser = createServerFn({ method: "POST" }).handler(async () => {
  const { getCookie, deleteCookie } = await import("@tanstack/react-start/server");
  const sessionId = getCookie("session_id");
  if (sessionId) {
    const { deleteSession } = await import("~/lib/session-store");
    deleteSession(sessionId);
  }
  deleteCookie("session_id", { path: "/" });
  return { status: "ok" };
});

// ---------------------------------------------------------------------------
// Loads: list, detail, create, claim
// ---------------------------------------------------------------------------

export interface LoadRow {
  id: string;
  poster_user_id: string;
  poster_display_name?: string;
  status: string;
  origin_address_line1: string;
  origin_city: string;
  origin_state: string;
  origin_zip: string;
  destination_address_line1: string;
  destination_city: string;
  destination_state: string;
  destination_zip: string;
  cargo_description: string;
  cargo_weight_lbs: number | null;
  cargo_type: string | null;
  pickup_date_start: string;
  pickup_date_end: string | null;
  delivery_date_start: string | null;
  delivery_date_end: string | null;
  rate_offer: number | null;
  rate_type: string;
  claimed_by_user_id: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const getLoads = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getSql } = await import("~/lib/db");
    const sql = getSql();
    type Row = {
      id: string;
      poster_user_id: string;
      status: string;
      origin_city: string;
      origin_state: string;
      destination_city: string;
      destination_state: string;
      cargo_description: string;
      cargo_weight_lbs: number | null;
      cargo_type: string | null;
      pickup_date_start: string;
      rate_offer: number | null;
      rate_type: string;
      display_name: string;
      created_at: string;
    };
    const rows = sql`
      SELECT l.id, l.poster_user_id, l.status,
             l.origin_city, l.origin_state,
             l.destination_city, l.destination_state,
             l.cargo_description, l.cargo_weight_lbs, l.cargo_type,
             l.pickup_date_start, l.rate_offer, l.rate_type,
             u.display_name, l.created_at
      FROM loads l
      JOIN users u ON l.poster_user_id = u.id
      ORDER BY l.created_at DESC
    ` as Row[];
    return rows;
  },
);

export const getLoad = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { id: string })
  .handler(async ({ data }) => {
    const { getSql } = await import("~/lib/db");
    const sql = getSql();
    const rows = sql`
      SELECT l.*, u.display_name as poster_display_name
      FROM loads l
      JOIN users u ON l.poster_user_id = u.id
      WHERE l.id = ${data.id}
    ` as any[];
    if (rows.length === 0) return null;
    return rows[0] as LoadRow;
  });

export const createLoad = createServerFn({ method: "POST" })
  .validator(
    (d: unknown) => d as {
      origin_address: string;
      origin_city: string;
      origin_state: string;
      origin_zip: string;
      destination_address: string;
      destination_city: string;
      destination_state: string;
      destination_zip: string;
      cargo_description: string;
      cargo_type?: string;
      cargo_weight_lbs?: number;
      pickup_date_start: string;
      pickup_date_end?: string;
      delivery_date_start?: string;
      delivery_date_end?: string;
      rate_offer?: number;
      rate_type?: string;
    },
  )
  .handler(async ({ data }) => {
    const session = await getSessionFromFn();
    if (!session) throw new Error("Unauthorized");
    if (session.role !== "shipper") throw new Error("Only shippers can post loads");

    const { getSql } = await import("~/lib/db");
    const sql = getSql();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    sql`
      INSERT INTO loads (
        id, poster_user_id, status,
        origin_address_line1, origin_city, origin_state, origin_zip,
        destination_address_line1, destination_city, destination_state, destination_zip,
        cargo_description, cargo_weight_lbs, cargo_type,
        pickup_date_start, pickup_date_end,
        delivery_date_start, delivery_date_end,
        rate_offer, rate_type,
        created_at, updated_at
      ) VALUES (
        ${id}, ${session.userId}, 'open',
        ${data.origin_address || ''}, ${data.origin_city}, ${data.origin_state}, ${data.origin_zip || ''},
        ${data.destination_address || ''}, ${data.destination_city}, ${data.destination_state}, ${data.destination_zip || ''},
        ${data.cargo_description}, ${data.cargo_weight_lbs ?? null}, ${data.cargo_type ?? null},
        ${data.pickup_date_start}, ${data.pickup_date_end ?? null},
        ${data.delivery_date_start ?? null}, ${data.delivery_date_end ?? null},
        ${data.rate_offer ?? null}, ${data.rate_type ?? 'flat'},
        ${now}, ${now}
      )
    `;

    return { id };
  });

export const claimLoad = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { id: string })
  .handler(async ({ data }) => {
    const session = await getSessionFromFn();
    if (!session) throw new Error("Unauthorized");
    if (session.role !== "carrier") throw new Error("Only carriers can claim loads");

    const { getSql } = await import("~/lib/db");
    const sql = getSql();

    const rows = sql`SELECT id, status, poster_user_id FROM loads WHERE id = ${data.id}` as any[];
    if (rows.length === 0) throw new Error("Load not found");
    const load = rows[0];

    if (load.status !== "open") throw new Error("Load is no longer available");
    if (load.poster_user_id === session.userId) throw new Error("You cannot claim your own load");

    const now = new Date().toISOString();
    sql`
      UPDATE loads
      SET status = 'claimed',
          claimed_by_user_id = ${session.userId},
          claimed_at = ${now},
          updated_at = ${now}
      WHERE id = ${data.id}
    `;

    return { success: true };
  });
