// API: /api/loads — List loads (GET) + Create load (POST)
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/loads")({
  GET: async ({ request }) => {
    const { getSql } = await import("~/lib/db");
    const sql = getSql();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;

    if (status) {
      const rows = sql`SELECT l.id, l.poster_user_id, l.status, l.origin_city, l.origin_state, l.destination_city, l.destination_state, l.cargo_description, l.cargo_weight_lbs, l.cargo_type, l.pickup_date_start, l.rate_offer, l.rate_type, u.display_name, l.created_at FROM loads l JOIN users u ON l.poster_user_id = u.id WHERE l.status = ${status} ORDER BY l.created_at DESC` as any[];
      return Response.json({ status: "ok", loads: rows });
    }

    const rows = sql`SELECT l.id, l.poster_user_id, l.status, l.origin_city, l.origin_state, l.destination_city, l.destination_state, l.cargo_description, l.cargo_weight_lbs, l.cargo_type, l.pickup_date_start, l.rate_offer, l.rate_type, u.display_name, l.created_at FROM loads l JOIN users u ON l.poster_user_id = u.id ORDER BY l.created_at DESC` as any[];
    return Response.json({ status: "ok", loads: rows });
  },

  POST: async ({ request }) => {
    const { getSql } = await import("~/lib/db");
    const sql = getSql();

    // Check auth
    const { getSession } = await import("~/lib/session-store");
    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/(?:^|;\s*)session_id=([^;]*)/);
    if (!match) {
      return Response.json({ status: "error", error: "Unauthorized" }, { status: 401 });
    }
    const session = getSession(match[1]);
    if (!session) {
      return Response.json({ status: "error", error: "Unauthorized" }, { status: 401 });
    }
    if (session.data.role !== "shipper") {
      return Response.json({ status: "error", error: "Only shippers can post loads" }, { status: 403 });
    }

    const body = await request.json();
    const {
      origin_address, origin_city, origin_state, origin_zip,
      destination_address, destination_city, destination_state, destination_zip,
      cargo_description, cargo_weight_lbs, cargo_type,
      pickup_date_start, pickup_date_end,
      delivery_date_start, delivery_date_end,
      rate_offer, rate_type,
    } = body;

    if (!origin_city || !origin_state || !destination_city || !destination_state || !cargo_description || !pickup_date_start) {
      return Response.json({ status: "error", error: "Missing required fields" }, { status: 400 });
    }

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
        ${origin_address ?? ''}, ${origin_city}, ${origin_state}, ${origin_zip ?? ''},
        ${destination_address ?? ''}, ${destination_city}, ${destination_state}, ${destination_zip ?? ''},
        ${cargo_description}, ${cargo_weight_lbs ?? null}, ${cargo_type ?? null},
        ${pickup_date_start}, ${pickup_date_end ?? null},
        ${delivery_date_start ?? null}, ${delivery_date_end ?? null},
        ${rate_offer ?? null}, ${rate_type ?? 'flat'},
        ${now}, ${now}
      )
    `;

    return Response.json({ status: "ok", id }, { status: 201 });
  },
});
