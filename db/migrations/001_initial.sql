-- LOGISTIQS NETWORK — Initial Schema
-- All seven business-data tables for the Neon Postgres database
-- Run against DATABASE_URL: bun run db/migrate.ts

-- =============================================================================
-- users
-- =============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('shipper', 'carrier')),
  display_name TEXT NOT NULL,
  company_name TEXT,
  company_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX users_email_idx ON users (email);

-- =============================================================================
-- companies
-- =============================================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_by_user_id UUID REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX companies_onboarding_stage_idx ON companies (onboarding_stage);
CREATE INDEX companies_industry_idx ON companies (industry);
CREATE INDEX companies_source_idx ON companies (source);

-- =============================================================================
-- contacts
-- =============================================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX contacts_company_id_idx ON contacts (company_id);

-- =============================================================================
-- loads
-- =============================================================================
CREATE TABLE loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_user_id UUID NOT NULL REFERENCES users (id),
  poster_company_id UUID REFERENCES companies (id),
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
  pickup_date_start DATE NOT NULL,
  pickup_date_end DATE,
  delivery_date_start DATE,
  delivery_date_end DATE,
  rate_offer INTEGER,
  rate_type TEXT DEFAULT 'flat' CHECK (rate_type IN ('flat', 'per_mile', 'negotiable')),
  claimed_by_user_id UUID REFERENCES users (id),
  claimed_by_company_id UUID REFERENCES companies (id),
  claimed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX loads_status_idx ON loads (status);
CREATE INDEX loads_poster_user_id_idx ON loads (poster_user_id);
CREATE INDEX loads_origin_state_destination_state_idx ON loads (origin_state, destination_state);
CREATE INDEX loads_pickup_date_start_idx ON loads (pickup_date_start);

-- =============================================================================
-- outreach_records
-- =============================================================================
CREATE TABLE outreach_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  contact_id UUID REFERENCES contacts (id),
  method TEXT NOT NULL CHECK (method IN ('email', 'phone', 'linkedin', 'other')),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'no_response', 'opted_out')),
  subject TEXT,
  body TEXT,
  notes TEXT,
  follow_up_date DATE,
  created_by_user_id UUID REFERENCES users (id),
  agent_campaign_id UUID,
  agent_prospect_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX outreach_company_id_idx ON outreach_records (company_id);
CREATE INDEX outreach_status_idx ON outreach_records (status);
CREATE INDEX outreach_follow_up_date_idx ON outreach_records (follow_up_date);

-- =============================================================================
-- agent_campaigns
-- =============================================================================
CREATE TABLE agent_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'failed')),
  target_industries TEXT[] NOT NULL,
  target_regions TEXT[] NOT NULL,
  prospect_source TEXT NOT NULL,
  max_prospects INTEGER,
  outreach_template TEXT,
  schedule_cron TEXT,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  total_prospects INTEGER NOT NULL DEFAULT 0,
  total_contacted INTEGER NOT NULL DEFAULT 0,
  total_responded INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- agent_prospects
-- =============================================================================
CREATE TABLE agent_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES agent_campaigns (id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies (id),
  company_name_raw TEXT NOT NULL,
  industry TEXT,
  region TEXT,
  website TEXT,
  contact_name_raw TEXT,
  contact_email_raw TEXT,
  contact_phone_raw TEXT,
  relevance_score NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered', 'validated', 'company_created', 'contacted', 'converted', 'rejected', 'duplicate')),
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX agent_prospects_campaign_id_idx ON agent_prospects (campaign_id);
CREATE INDEX agent_prospects_status_idx ON agent_prospects (status);

-- =============================================================================
-- Session store (SQLite — this is just reference; the actual session table
-- is auto-created by src/lib/session-store.ts on first use)
-- =============================================================================
-- CREATE TABLE sessions (
--   id TEXT PRIMARY KEY,
--   user_id UUID NOT NULL,
--   data JSONB NOT NULL DEFAULT '{}',
--   created_at TEXT NOT NULL DEFAULT (datetime('now')),
--   expires_at TEXT NOT NULL
-- );

-- =============================================================================
-- Migration tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO schema_version (version) VALUES (1);
