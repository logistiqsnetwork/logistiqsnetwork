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

// ---------------------------------------------------------------------------
// CRM — Companies
// ---------------------------------------------------------------------------

export interface CompanyRow {
  id: string;
  name: string;
  company_type: string;
  phone: string | null;
  address_line1: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  website: string | null;
  industry: string | null;
  source: string | null;
  onboarding_stage: string;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  last_contact_date: string | null;
  next_follow_up: string | null;
}

export interface ContactRow {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachRow {
  id: string;
  company_id: string;
  contact_id: string | null;
  method: string;
  direction: string;
  status: string;
  subject: string | null;
  body: string | null;
  notes: string | null;
  follow_up_date: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export const getCompanies = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as {
    search?: string;
    industry?: string;
    stage?: string;
    company_type?: string;
  } | undefined)
  .handler(async ({ data }) => {
    const { getSql } = await import("~/lib/db");
    const sql = getSql();

    let query = `
      SELECT c.*,
        (SELECT MAX(o.created_at) FROM outreach_records o WHERE o.company_id = c.id) as last_contact_date,
        (SELECT o2.follow_up_date FROM outreach_records o2
         WHERE o2.company_id = c.id AND o2.follow_up_date >= date('now')
         ORDER BY o2.follow_up_date ASC LIMIT 1) as next_follow_up
      FROM companies c
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (data?.search) {
      query += ` AND c.name LIKE ?`;
      params.push(`%${data.search}%`);
    }
    if (data?.industry) {
      query += ` AND c.industry = ?`;
      params.push(data.industry);
    }
    if (data?.stage) {
      query += ` AND c.onboarding_stage = ?`;
      params.push(data.stage);
    }
    if (data?.company_type) {
      query += ` AND c.company_type = ?`;
      params.push(data.company_type);
    }

    query += ` ORDER BY c.created_at DESC`;

    // Build query manually since we need dynamic WHERE
    let paramIdx = 0;
    const finalQuery = query.replace(/\?/g, () => {
      const val = params[paramIdx++];
      if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
      return String(val);
    });

    const rows = sql.unsafe(finalQuery) as CompanyRow[];
    return rows;
  });

export const getCompany = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { id: string })
  .handler(async ({ data }) => {
    const { getSql } = await import("~/lib/db");
    const sql = getSql();

    const companies = sql`SELECT * FROM companies WHERE id = ${data.id}` as any[];
    if (companies.length === 0) return null;
    const company = companies[0] as CompanyRow;

    const contacts = sql`SELECT * FROM contacts WHERE company_id = ${data.id} ORDER BY is_primary DESC, created_at DESC` as ContactRow[];

    const outreach = sql`
      SELECT o.*, c.first_name || ' ' || c.last_name as contact_name
      FROM outreach_records o
      LEFT JOIN contacts c ON o.contact_id = c.id
      WHERE o.company_id = ${data.id}
      ORDER BY o.created_at DESC
    ` as any[];

    return { company, contacts, outreach };
  });

export const createCompany = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as {
    name: string;
    company_type: string;
    industry?: string;
    phone?: string;
    address_line1?: string;
    address_city?: string;
    address_state?: string;
    address_zip?: string;
    website?: string;
    source?: string;
    notes?: string;
  })
  .handler(async ({ data }) => {
    const session = await getSessionFromFn();
    if (!session) throw new Error("Unauthorized");

    const { getSql } = await import("~/lib/db");
    const sql = getSql();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    sql`
      INSERT INTO companies (
        id, name, company_type, phone,
        address_line1, address_city, address_state, address_zip,
        website, industry, source, onboarding_stage, notes,
        created_by_user_id, created_at, updated_at
      ) VALUES (
        ${id}, ${data.name}, ${data.company_type}, ${data.phone ?? null},
        ${data.address_line1 ?? null}, ${data.address_city ?? null}, ${data.address_state ?? null}, ${data.address_zip ?? null},
        ${data.website ?? null}, ${data.industry ?? null}, ${data.source ?? 'manual'}, 'lead', ${data.notes ?? null},
        ${session.userId}, ${now}, ${now}
      )
    `;

    return { id };
  });

export const updateCompany = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as {
    id: string;
    name?: string;
    company_type?: string;
    industry?: string;
    phone?: string;
    address_line1?: string;
    address_city?: string;
    address_state?: string;
    address_zip?: string;
    website?: string;
    source?: string;
    onboarding_stage?: string;
    notes?: string;
  })
  .handler(async ({ data }) => {
    const session = await getSessionFromFn();
    if (!session) throw new Error("Unauthorized");

    const { getSql } = await import("~/lib/db");
    const sql = getSql();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      name: "name",
      company_type: "company_type",
      industry: "industry",
      phone: "phone",
      address_line1: "address_line1",
      address_city: "address_city",
      address_state: "address_state",
      address_zip: "address_zip",
      website: "website",
      source: "source",
      onboarding_stage: "onboarding_stage",
      notes: "notes",
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if ((data as any)[key] !== undefined) {
        fields.push(`${col} = ?`);
        values.push((data as any)[key]);
      }
    }

    if (fields.length === 0) return { success: true };

    fields.push("updated_at = ?");
    values.push(now);
    values.push(data.id);

    const query = `UPDATE companies SET ${fields.join(", ")} WHERE id = ?`;
    sql.unsafe(
      query.replace(/\?/g, () => {
        const v = values.shift();
        if (v === null) return "NULL";
        if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
        return String(v);
      })
    );

    return { success: true };
  });

// ---------------------------------------------------------------------------
// CRM — Contacts
// ---------------------------------------------------------------------------

export const getContacts = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { companyId: string })
  .handler(async ({ data }) => {
    const { getSql } = await import("~/lib/db");
    const sql = getSql();
    const rows = sql`SELECT * FROM contacts WHERE company_id = ${data.companyId} ORDER BY is_primary DESC, created_at DESC` as ContactRow[];
    return rows;
  });

export const createContact = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as {
    company_id: string;
    first_name: string;
    last_name: string;
    title?: string;
    email?: string;
    phone?: string;
    is_primary?: boolean;
    notes?: string;
  })
  .handler(async ({ data }) => {
    const session = await getSessionFromFn();
    if (!session) throw new Error("Unauthorized");

    const { getSql } = await import("~/lib/db");
    const sql = getSql();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    sql`
      INSERT INTO contacts (id, company_id, first_name, last_name, title, email, phone, is_primary, notes, created_at, updated_at)
      VALUES (
        ${id}, ${data.company_id}, ${data.first_name}, ${data.last_name},
        ${data.title ?? null}, ${data.email ?? null}, ${data.phone ?? null},
        ${data.is_primary ? 1 : 0}, ${data.notes ?? null}, ${now}, ${now}
      )
    `;

    return { id };
  });

// ---------------------------------------------------------------------------
// CRM — Outreach
// ---------------------------------------------------------------------------

export const getOutreach = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { companyId: string })
  .handler(async ({ data }) => {
    const { getSql } = await import("~/lib/db");
    const sql = getSql();
    const rows = sql`
      SELECT o.*, c.first_name || ' ' || c.last_name as contact_name
      FROM outreach_records o
      LEFT JOIN contacts c ON o.contact_id = c.id
      WHERE o.company_id = ${data.companyId}
      ORDER BY o.created_at DESC
    ` as any[];
    return rows;
  });

export const createOutreach = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as {
    company_id: string;
    contact_id?: string;
    method: string;
    subject?: string;
    notes?: string;
    follow_up_date?: string;
    status?: string;
  })
  .handler(async ({ data }) => {
    const session = await getSessionFromFn();
    if (!session) throw new Error("Unauthorized");

    const { getSql } = await import("~/lib/db");
    const sql = getSql();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    sql`
      INSERT INTO outreach_records (
        id, company_id, contact_id, method, direction, status,
        subject, notes, follow_up_date, created_by_user_id, created_at
      ) VALUES (
        ${id}, ${data.company_id}, ${data.contact_id ?? null}, ${data.method},
        'outbound', ${data.status ?? 'pending'},
        ${data.subject ?? null}, ${data.notes ?? null}, ${data.follow_up_date ?? null},
        ${session.userId}, ${now}
      )
    `;

    return { id };
  });

// ---------------------------------------------------------------------------
// CRM — Stats
// ---------------------------------------------------------------------------

export const getCRMStats = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("~/lib/db");
  const sql = getSql();

  const total = sql.unsafe(`SELECT COUNT(*) as count FROM companies`) as any[];
  const byStage = sql.unsafe(
    `SELECT onboarding_stage, COUNT(*) as count FROM companies GROUP BY onboarding_stage`
  ) as any[];

  const outreachThisWeek = sql.unsafe(
    `SELECT COUNT(*) as count FROM outreach_records WHERE created_at >= date('now', '-7 days')`
  ) as any[];

  const followUpsDue = sql.unsafe(
    `SELECT COUNT(*) as count FROM outreach_records WHERE follow_up_date BETWEEN date('now') AND date('now', '+7 days')`
  ) as any[];

  return {
    total: total[0]?.count ?? 0,
    byStage,
    outreachThisWeek: outreachThisWeek[0]?.count ?? 0,
    followUpsDue: followUpsDue[0]?.count ?? 0,
  };
});
