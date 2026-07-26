-- LOGISTIQS NETWORK — Initial Schema (SQLite)
-- SQLite-compatible DDL for the MVP
-- Run via: bun run db/migrate.ts
-- UUIDs stored as TEXT, timestamps as ISO 8601 TEXT, arrays as JSON TEXT.

-- =============================================================================
-- users
-- =============================================================================
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('shipper', 'carrier')),
  display_name TEXT NOT NULL,
  company_name TEXT,
  company_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX users_email_idx ON users (email);

-- =============================================================================
-- companies
-- =============================================================================
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_type TEXT NOT NULL CHECK (company_type IN ('shipper', 'carrier', 'broker', 'prospect', 'other')),
  phone TEXT,
  address_line1 TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  website TEXT,
  industry TEXT,
  source TEXT,
  onboarding_stage TEXT NOT NULL DEFAULT 'lead' CHECK (onboarding_stage IN ('lead', 'contacted', 'engaged', 'registered', 'active', 'churned')),
  notes TEXT,
  created_by_user_id TEXT REFERENCES users (id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX companies_onboarding_stage_idx ON companies (onboarding_stage);
CREATE INDEX companies_industry_idx ON companies (industry);
CREATE INDEX companies_source_idx ON companies (source);

-- =============================================================================
-- contacts
-- =============================================================================
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX contacts_company_id_idx ON contacts (company_id);

-- =============================================================================
-- loads
-- =============================================================================
CREATE TABLE loads (
  id TEXT PRIMARY KEY,
  poster_user_id TEXT NOT NULL REFERENCES users (id),
  poster_company_id TEXT REFERENCES companies (id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'in_transit', 'delivered', 'cancelled', 'expired')),
  origin_address_line1 TEXT NOT NULL,
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL,
  origin_zip TEXT NOT NULL,
  destination_address_line1 TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_state TEXT NOT NULL,
  destination_zip TEXT NOT NULL,
  cargo_description TEXT NOT NULL,
  cargo_weight_lbs INTEGER,
  cargo_type TEXT,
  pickup_date_start TEXT NOT NULL,
  pickup_date_end TEXT,
  delivery_date_start TEXT,
  delivery_date_end TEXT,
  rate_offer INTEGER,
  rate_type TEXT DEFAULT 'flat' CHECK (rate_type IN ('flat', 'per_mile', 'negotiable')),
  claimed_by_user_id TEXT REFERENCES users (id),
  claimed_by_company_id TEXT REFERENCES companies (id),
  claimed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX loads_status_idx ON loads (status);
CREATE INDEX loads_poster_user_id_idx ON loads (poster_user_id);
CREATE INDEX loads_origin_destination_idx ON loads (origin_state, destination_state);
CREATE INDEX loads_pickup_date_idx ON loads (pickup_date_start);

-- =============================================================================
-- outreach_records
-- =============================================================================
CREATE TABLE outreach_records (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies (id),
  contact_id TEXT REFERENCES contacts (id),
  method TEXT NOT NULL CHECK (method IN ('email', 'phone', 'linkedin', 'other')),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'no_response', 'opted_out')),
  subject TEXT,
  body TEXT,
  notes TEXT,
  follow_up_date TEXT,
  created_by_user_id TEXT REFERENCES users (id),
  agent_campaign_id TEXT,
  agent_prospect_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX outreach_company_id_idx ON outreach_records (company_id);
CREATE INDEX outreach_status_idx ON outreach_records (status);
CREATE INDEX outreach_follow_up_idx ON outreach_records (follow_up_date);

-- =============================================================================
-- agent_campaigns
-- =============================================================================
CREATE TABLE agent_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'failed')),
  target_industries TEXT NOT NULL DEFAULT '[]',
  target_regions TEXT NOT NULL DEFAULT '[]',
  prospect_source TEXT NOT NULL,
  max_prospects INTEGER,
  outreach_template TEXT,
  schedule_cron TEXT,
  last_run_at TEXT,
  next_run_at TEXT,
  total_prospects INTEGER NOT NULL DEFAULT 0,
  total_contacted INTEGER NOT NULL DEFAULT 0,
  total_responded INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- agent_prospects
-- =============================================================================
CREATE TABLE agent_prospects (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES agent_campaigns (id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies (id),
  company_name_raw TEXT NOT NULL,
  industry TEXT,
  region TEXT,
  website TEXT,
  contact_name_raw TEXT,
  contact_email_raw TEXT,
  contact_phone_raw TEXT,
  relevance_score REAL,
  status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered', 'validated', 'company_created', 'contacted', 'converted', 'rejected', 'duplicate')),
  raw_data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);
CREATE INDEX agent_prospects_campaign_id_idx ON agent_prospects (campaign_id);
CREATE INDEX agent_prospects_status_idx ON agent_prospects (status);
