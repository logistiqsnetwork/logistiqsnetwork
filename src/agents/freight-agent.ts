/**
 * Freight Acquisition Agent Pipeline
 *
 * Core pipeline stages:
 *   1. DISCOVERY  — Find prospect companies in target industries/regions
 *   2. VALIDATION — Deduplicate and score prospects
 *   3. CRM        — Create company + contact records
 *   4. OUTREACH   — Draft personalized outreach messages
 *   5. LOG        — Update campaign counters and activity log
 *
 * All DB access goes through getSql() from ~/lib/db.
 * UUIDs via crypto.randomUUID().
 */

import type { Database } from "bun:sqlite";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RawProspect {
  companyName: string;
  industry?: string;
  region?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  sourceUrl?: string;
  rawSnippet?: string;
}

export interface ValidatedProspect extends RawProspect {
  isDuplicate: boolean;
  relevanceScore: number;
  validationNotes: string;
}

export interface CRMResult {
  prospectId: string;
  companyId: string;
  contactId?: string;
}

export interface OutreachDraft {
  companyId: string;
  contactId?: string;
  subject: string;
  body: string;
  method: "email" | "phone" | "linkedin" | "other";
}

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  target_industries: string;
  target_regions: string;
  prospect_source: string;
  max_prospects: number | null;
  outreach_template: string | null;
  schedule_cron: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  total_prospects: number;
  total_contacted: number;
  total_responded: number;
  notes: string | null;
}

// Lazy import to avoid DB import in client bundles.
let _getSql: ReturnType<typeof _loadSql> | null = null;
type SqlFn = ReturnType<typeof _createTaggedSql>;

async function _loadSql() {
  return (await import("~/lib/db")).getSql;
}

async function getSql(): Promise<SqlFn> {
  if (!_getSql) _getSql = _loadSql();
  return (await _getSql)();
}

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

/**
 * Stage 1 — DISCOVERY
 * Reads prospects from seed CSV + builds keyword-based supplemental list.
 * Filters by campaign's target industries/regions.
 */
export async function discover(campaignId: string): Promise<RawProspect[]> {
  console.log("[Agent] Stage 1 — DISCOVERY for campaign", campaignId);

  const sql = await getSql();

  // Load campaign config
  const campaigns = sql`
    SELECT id, target_industries, target_regions, max_prospects
    FROM agent_campaigns WHERE id = ${campaignId}
  ` as any[];
  if (campaigns.length === 0) {
    console.warn("[Agent] Campaign not found:", campaignId);
    return [];
  }

  const campaign = campaigns[0];
  let targetIndustries: string[] = [];
  let targetRegions: string[] = [];
  try {
    targetIndustries = JSON.parse(campaign.target_industries || "[]");
    targetRegions = JSON.parse(campaign.target_regions || "[]");
  } catch {
    targetIndustries = [];
    targetRegions = [];
  }

  const maxProspects = campaign.max_prospects || 50;

  const prospects: RawProspect[] = [];

  // 1. Read from seed CSV
  try {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const csvPath = join(process.cwd(), "data", "seed_prospects.csv");
    const csv = readFileSync(csvPath, "utf8");

    const lines = csv.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
    const headers = lines[0].split(",").map((h) => h.trim());
    const ciIdx = headers.indexOf("company_name");
    const indIdx = headers.indexOf("industry");
    const cityIdx = headers.indexOf("city");
    const stateIdx = headers.indexOf("state");
    const webIdx = headers.indexOf("website");
    const cNameIdx = headers.indexOf("contact_name");
    const cEmailIdx = headers.indexOf("contact_email");
    const cPhoneIdx = headers.indexOf("contact_phone");

    for (let i = 1; i < lines.length; i++) {
      // Simple CSV parse (no quoted commas in seed data)
      const cols = lines[i].split(",").map((c) => c.trim());
      const industry = cols[indIdx] || "";
      const region = cols[stateIdx] || "";

      // Filter by campaign targets
      const industryMatch =
        targetIndustries.length === 0 ||
        targetIndustries.some((t) => industry.toLowerCase().includes(t.toLowerCase()));
      const regionMatch =
        targetRegions.length === 0 ||
        targetRegions.some((r) => region.toUpperCase() === r.toUpperCase());

      if (industryMatch && regionMatch) {
        prospects.push({
          companyName: cols[ciIdx] || "",
          industry: industry || undefined,
          region: region || undefined,
          website: cols[webIdx] || undefined,
          contactName: cols[cNameIdx] || undefined,
          contactEmail: cols[cEmailIdx] || undefined,
          contactPhone: cols[cPhoneIdx] || undefined,
          sourceUrl: csvPath,
          rawSnippet: `Seed CSV row ${i}`,
        });
      }

      if (prospects.length >= maxProspects) break;
    }
  } catch (err) {
    console.warn("[Agent] Seed CSV read error (non-fatal):", err);
  }

  // 2. Keyword-based supplemental (for when CSV doesn't have enough matches)
  if (prospects.length < maxProspects) {
    // Build keyword combos for future expansion
    const industryKeywords: Record<string, string[]> = {
      mining: ["Mining", "Minerals", "Quarry", "Aggregates", "Metals"],
      manufacturing: ["Manufacturing", "Industrial", "Steel", "Chemical", "Fabrication"],
      agriculture: ["Farms", "Grain", "Ag Processing", "Food Processing", "Commodities"],
      retail_distribution: ["Distribution Center", "Logistics", "Warehouse", "Supply Chain"],
    };

    const remaining = maxProspects - prospects.length;
    let added = 0;

    for (const industry of targetIndustries) {
      if (added >= remaining) break;
      const keywords = industryKeywords[industry.toLowerCase()] || [industry];
      for (const kw of keywords) {
        if (added >= remaining) break;
        for (const region of targetRegions) {
          if (added >= remaining) break;
          prospects.push({
            companyName: `${kw} Co. — ${region} Region`,
            industry,
            region,
            sourceUrl: "keyword_generated",
            rawSnippet: `Generated from keyword: ${kw} + region: ${region}`,
          });
          added++;
        }
      }
    }
  }

  console.log(`[Agent] Discovery found ${prospects.length} raw prospects`);
  return prospects.slice(0, maxProspects);
}

/**
 * Stage 2 — VALIDATION
 * Deduplicates against existing companies and scores relevance.
 */
export async function validate(
  campaignId: string,
  prospects: RawProspect[],
): Promise<ValidatedProspect[]> {
  console.log("[Agent] Stage 2 — VALIDATION for campaign", campaignId, prospects.length, "prospects");
  const sql = await getSql();

  const campaigns = sql`
    SELECT target_industries, target_regions FROM agent_campaigns WHERE id = ${campaignId}
  ` as any[];
  let targetIndustries: string[] = [];
  let targetRegions: string[] = [];
  try {
    if (campaigns.length > 0) {
      targetIndustries = JSON.parse(campaigns[0].target_industries || "[]");
      targetRegions = JSON.parse(campaigns[0].target_regions || "[]");
    }
  } catch { /* ignore */ }

  const validated: ValidatedProspect[] = [];

  for (const p of prospects) {
    // Check for duplicates by name
    const existing = sql`
      SELECT id FROM companies WHERE name = ${p.companyName} LIMIT 1
    ` as any[];
    const isDuplicate = existing.length > 0;

    // Also check agent_prospects to avoid reprocessing within the same campaign
    const alreadyInCampaign = sql`
      SELECT id FROM agent_prospects
      WHERE campaign_id = ${campaignId} AND company_name_raw = ${p.companyName}
      LIMIT 1
    ` as any[];

    const isAlreadyProcessed = alreadyInCampaign.length > 0;

    // Relevance score: industry match (0.4) + region match (0.3) + website present (0.2) + contact present (0.1)
    let relevanceScore = 0;
    const industry = (p.industry || "").toLowerCase();
    const region = (p.region || "").toUpperCase();

    const industryMatch =
      targetIndustries.length === 0 ||
      targetIndustries.some((t) => industry.includes(t.toLowerCase()) || t.toLowerCase().includes(industry));
    const regionMatch =
      targetRegions.length === 0 ||
      targetRegions.some((r) => r.toUpperCase() === region);

    relevanceScore += industryMatch ? 0.4 : 0.1;
    relevanceScore += regionMatch ? 0.3 : 0.05;
    relevanceScore += p.website ? 0.2 : 0;
    relevanceScore += p.contactName ? 0.1 : 0;

    let notes = "";
    if (isDuplicate) notes = "Duplicate: company exists in companies table. ";
    if (isAlreadyProcessed) notes += "Already processed in this campaign. ";

    validated.push({
      ...p,
      isDuplicate: isDuplicate || isAlreadyProcessed,
      relevanceScore: Math.round(relevanceScore * 100) / 100,
      validationNotes: notes.trim() || "Validated — new prospect",
    });
  }

  console.log(
    `[Agent] Validation complete: ${validated.filter((v) => !v.isDuplicate).length} new, ` +
      `${validated.filter((v) => v.isDuplicate).length} duplicates`,
  );
  return validated;
}

/**
 * Stage 3 — POPULATE CRM
 * Inserts validated (non-duplicate) prospects into agent_prospects.
 * Optionally creates shell company records.
 */
export async function populateCRM(
  campaignId: string,
  prospects: ValidatedProspect[],
): Promise<CRMResult[]> {
  console.log("[Agent] Stage 3 — CRM POPULATION for campaign", campaignId, prospects.length, "prospects");
  const sql = await getSql();
  const results: CRMResult[] = [];
  const now = new Date().toISOString();

  for (const p of prospects) {
    const prospectId = crypto.randomUUID();

    // Insert into agent_prospects
    sql`
      INSERT INTO agent_prospects (
        id, campaign_id, company_name_raw, industry, region, website,
        contact_name_raw, contact_email_raw, contact_phone_raw,
        relevance_score, status, raw_data, created_at
      ) VALUES (
        ${prospectId}, ${campaignId}, ${p.companyName}, ${p.industry ?? null},
        ${p.region ?? null}, ${p.website ?? null},
        ${p.contactName ?? null}, ${p.contactEmail ?? null},
        ${p.contactPhone ?? null},
        ${p.relevanceScore},
        ${p.isDuplicate ? "duplicate" : "validated"},
        ${JSON.stringify({ sourceUrl: p.sourceUrl, snippet: p.rawSnippet, validationNotes: p.validationNotes })},
        ${now}
      )
    `;

    let companyId: string | null = null;
    let contactId: string | null = null;

    // Create a shell company record for new prospects (not duplicates)
    if (!p.isDuplicate) {
      companyId = crypto.randomUUID();

      sql`
        INSERT INTO companies (
          id, name, company_type, website, industry,
          address_city, address_state,
          source, onboarding_stage, notes, created_at, updated_at
        ) VALUES (
          ${companyId}, ${p.companyName}, 'prospect',
          ${p.website ?? null}, ${p.industry ?? null},
          ${null}, ${p.region ?? null},
          'agent_discovery', 'lead',
          ${"Agent-discovered via campaign " + campaignId},
          ${now}, ${now}
        )
      `;

      // Link the prospect to the company
      sql`
        UPDATE agent_prospects SET company_id = ${companyId}, status = 'company_created'
        WHERE id = ${prospectId}
      `;

      // Create a contact if we have a name
      if (p.contactName) {
        contactId = crypto.randomUUID();
        const nameParts = p.contactName.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        sql`
          INSERT INTO contacts (
            id, company_id, first_name, last_name, email, phone, is_primary, created_at, updated_at
          ) VALUES (
            ${contactId}, ${companyId}, ${firstName}, ${lastName},
            ${p.contactEmail ?? null}, ${p.contactPhone ?? null},
            1, ${now}, ${now}
          )
        `;
      }
    }

    results.push({
      prospectId,
      companyId: companyId || "",
      contactId: contactId || undefined,
    });
  }

  console.log(`[Agent] CRM population complete: ${results.length} prospects processed`);
  return results;
}

/** Industry-specific message templates */
function getMessageTemplate(industry: string): { subject: string; bodyTemplate: string } {
  const templates: Record<string, { subject: string; bodyTemplate: string }> = {
    mining: {
      subject: "Freight solutions for {company} — LOGISTIQS NETWORK",
      bodyTemplate: `Hi {contactName},\n\nI noticed {company} is a leader in the {industry} space, shipping minerals, aggregates, and bulk materials. LOGISTIQS NETWORK is a new freight marketplace connecting shippers with reliable carriers.\n\nWe're building a network of carriers specifically experienced with mining and bulk material transport. Would you be open to a quick call about listing your loads with us?\n\nBest,\nThe LOGISTIQS Team`,
    },
    manufacturing: {
      subject: "Streamline {company}'s freight — LOGISTIQS NETWORK",
      bodyTemplate: `Hi {contactName},\n\nAs a key player in {industry}, {company} likely moves significant volumes of raw materials and finished goods. LOGISTIQS NETWORK is a growing freight marketplace that connects manufacturers with vetted carriers.\n\nWe'd love to learn about your shipping needs and see if our network is a fit. Could we schedule a brief call?\n\nBest,\nThe LOGISTIQS Team`,
    },
    agriculture: {
      subject: "Freight capacity for {company} — LOGISTIQS NETWORK",
      bodyTemplate: `Hi {contactName},\n\nWith {company}'s operations in {industry}, timely freight is critical — from harvest to processing to market. LOGISTIQS NETWORK connects agricultural shippers with carriers who understand seasonal demands and perishable timelines.\n\nWould you be open to exploring how our marketplace could support your logistics?\n\nBest,\nThe LOGISTIQS Team`,
    },
    retail_distribution: {
      subject: "Distribution logistics for {company} — LOGISTIQS NETWORK",
      bodyTemplate: `Hi {contactName},\n\n{company}'s distribution network depends on reliable freight. LOGISTIQS NETWORK is a new marketplace that makes it easy to post loads and connect with qualified carriers — from regional LTL to coast-to-coast FTL.\n\nCould we schedule a quick call to discuss your freight needs?\n\nBest,\nThe LOGISTIQS Team`,
    },
  };

  const key = industry.toLowerCase();
  // Find best matching template by partial match
  for (const [k, v] of Object.entries(templates)) {
    if (key.includes(k) || k.includes(key)) return v;
  }

  // Default template
  return {
    subject: "Freight partnership opportunity — LOGISTIQS NETWORK",
    bodyTemplate: `Hi {contactName},\n\nI'm reaching out because {company} operates in the {industry} space and likely has regular freight needs. LOGISTIQS NETWORK is a new marketplace connecting shippers with reliable carriers.\n\nWould you be open to a brief call to explore whether our network could support your logistics?\n\nBest,\nThe LOGISTIQS Team`,
  };
}

/**
 * Stage 4 — DRAFT OUTREACH
 * Generates personalized outreach messages and stores them as pending records.
 * Does NOT auto-send — requires human review.
 */
export async function draftOutreach(
  campaignId: string,
  results: CRMResult[],
): Promise<OutreachDraft[]> {
  console.log("[Agent] Stage 4 — OUTREACH DRAFTING for campaign", campaignId, results.length, "results");
  const sql = await getSql();
  const now = new Date().toISOString();
  const drafts: OutreachDraft[] = [];

  for (const r of results) {
    if (!r.companyId) continue; // Skip duplicates without company records

    // Fetch prospect + company details
    const rows = sql`
      SELECT ap.company_name_raw, ap.industry, ap.region, ap.contact_name_raw,
             ap.contact_email_raw, ap.id as prospect_id,
             c.id as company_id
      FROM agent_prospects ap
      JOIN companies c ON c.id = ${r.companyId}
      WHERE ap.id = ${r.prospectId}
    ` as any[];

    if (rows.length === 0) continue;
    const p = rows[0];

    const contactName = p.contact_name_raw || "Logistics Team";
    const industry = p.industry || "freight";

    const template = getMessageTemplate(industry);
    const subject = template.subject.replace("{company}", p.company_name_raw);
    const body = template.bodyTemplate
      .replace(/\{company\}/g, p.company_name_raw)
      .replace(/\{contactName\}/g, contactName)
      .replace(/\{industry\}/g, industry);

    const method = p.contact_email_raw ? "email" : "phone";

    // Insert outreach record with status=pending
    const outreachId = crypto.randomUUID();
    sql`
      INSERT INTO outreach_records (
        id, company_id, contact_id, method, direction,
        status, subject, body, notes,
        agent_campaign_id, agent_prospect_id, created_at
      ) VALUES (
        ${outreachId}, ${r.companyId}, ${r.contactId ?? null},
        ${method}, 'outbound',
        'pending', ${subject}, ${body},
        'Requires human review before sending',
        ${campaignId}, ${r.prospectId}, ${now}
      )
    `;

    drafts.push({
      companyId: r.companyId,
      contactId: r.contactId,
      subject,
      body,
      method,
    });
  }

  console.log(`[Agent] Outreach drafted: ${drafts.length} messages (pending human review)`);
  return drafts;
}

/**
 * Stage 5 — LOG ACTIVITY
 * Updates campaign counters and prospect processed_at timestamps.
 */
export async function logActivity(
  campaignId: string,
  drafts: OutreachDraft[],
  validatedCount: number,
): Promise<void> {
  console.log("[Agent] Stage 5 — LOGGING for campaign", campaignId, drafts.length, "drafts");
  const sql = await getSql();
  const now = new Date().toISOString();

  // Count prospects created in this run
  const prospectCounts = sql`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status IN ('validated','company_created') THEN 1 ELSE 0 END) as new_prospects
    FROM agent_prospects
    WHERE campaign_id = ${campaignId} AND processed_at IS NULL
  ` as any[];

  const totalNew = prospectCounts[0]?.new_prospects || 0;

  // Update campaign counters
  const campaign = sql`
    SELECT total_prospects, total_contacted, total_responded FROM agent_campaigns WHERE id = ${campaignId}
  ` as any[];

  if (campaign.length > 0) {
    const c = campaign[0];
    sql`
      UPDATE agent_campaigns
      SET total_prospects = ${c.total_prospects + totalNew},
          total_contacted = ${c.total_contacted + drafts.length},
          last_run_at = ${now},
          updated_at = ${now}
      WHERE id = ${campaignId}
    `;
  }

  // Update agent_prospects: set processed_at
  sql`
    UPDATE agent_prospects
    SET processed_at = ${now}
    WHERE campaign_id = ${campaignId} AND processed_at IS NULL
  `;

  console.log(`[Agent] Logging complete: +${totalNew} prospects, +${drafts.length} outreach drafts`);
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export async function runPipelineForCampaign(
  campaignId: string,
  runId: string,
): Promise<{ validated: number; drafts: number }> {
  console.log("[Agent] Starting pipeline run", runId, "for campaign", campaignId);
  const sql = await getSql();

  try {
    // Mark campaign as running
    sql`UPDATE agent_campaigns SET status = 'running', updated_at = ${new Date().toISOString()} WHERE id = ${campaignId}`;

    const rawProspects = await discover(campaignId);
    const validated = await validate(campaignId, rawProspects);
    const nonDuplicates = validated.filter((v) => !v.isDuplicate);
    const crmResults = await populateCRM(campaignId, nonDuplicates);
    const drafts = await draftOutreach(campaignId, crmResults);
    await logActivity(campaignId, drafts, validated.length);

    console.log(
      `[Agent] Pipeline run ${runId} complete: ${validated.length} validated, ` +
        `${nonDuplicates.length} new, ${drafts.length} drafts`,
    );

    return { validated: validated.length, drafts: drafts.length };
  } catch (err) {
    console.error("[Agent] Pipeline run", runId, "failed:", err);
    // Mark campaign as failed
    try {
      sql`UPDATE agent_campaigns SET status = 'failed', notes = ${"Error: " + String(err)}, updated_at = ${new Date().toISOString()} WHERE id = ${campaignId}`;
    } catch { /* ignore */ }
    throw err;
  }
}

/**
 * Find and run all campaigns due for execution.
 * Called by the scheduler.
 */
export async function runDueCampaigns(): Promise<{
  total: number;
  results: { campaignId: string; validated: number; drafts: number }[];
}> {
  console.log("[Agent] Checking for due campaigns...");
  const sql = await getSql();
  const now = new Date().toISOString();

  // Find campaigns that are running and due
  const due = sql`
    SELECT id FROM agent_campaigns
    WHERE status = 'running'
      AND (next_run_at IS NULL OR next_run_at <= ${now})
    LIMIT 10
  ` as any[];

  if (due.length === 0) {
    console.log("[Agent] No active campaigns with due runs found.");
    return { total: 0, results: [] };
  }

  console.log(`[Agent] Found ${due.length} due campaign(s)`);
  const results: { campaignId: string; validated: number; drafts: number }[] = [];

  for (const c of due) {
    const runId = crypto.randomUUID();
    try {
      const result = await runPipelineForCampaign(c.id, runId);
      results.push({ campaignId: c.id, ...result });

      // Set next_run_at based on schedule_cron (simple daily default)
      const campaign = sql`SELECT schedule_cron FROM agent_campaigns WHERE id = ${c.id}` as any[];
      if (campaign.length > 0 && campaign[0].schedule_cron) {
        // For MVP: just set next run to tomorrow at 6 AM UTC
        // In production, parse the cron expression properly
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(6, 0, 0, 0);
        sql`
          UPDATE agent_campaigns
          SET next_run_at = ${tomorrow.toISOString()}
          WHERE id = ${c.id}
        `;
      }
    } catch (err) {
      console.error(`[Agent] Campaign ${c.id} run failed:`, err);
    }
  }

  console.log(`[Agent] Due campaigns complete: ${results.length}/${due.length} succeeded.`);
  return { total: due.length, results };
}

// ---------------------------------------------------------------------------
// Re-export for backward compatibility with scheduler stub
// ---------------------------------------------------------------------------
export { runDueCampaigns as checkDueCampaigns };

function _createTaggedSql(_db: Database): any {
  // Type placeholder for the actual getSql() factory
  return null as any;
}
