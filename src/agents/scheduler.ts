/**
 * Agent Scheduler
 *
 * Uses Bun.cron to run the freight acquisition agent pipeline on a schedule.
 * For the MVP, this is started alongside the web server (in serve.ts).
 *
 * The default schedule is daily at 6 AM UTC. The scheduler checks all active
 * campaigns and runs any whose next_run_at <= now.
 */

import { runDueCampaigns } from "~/agents/freight-agent";

let _started = false;

export function startScheduler(): void {
  if (_started) return;
  _started = true;

  console.log("[Scheduler] Agent scheduler starting...");

  // Daily at 6 AM UTC — check all active campaigns
  if (typeof Bun !== "undefined" && Bun.cron) {
    Bun.cron("0 6 * * *", async () => {
      console.log("[Scheduler] Cron triggered — running due campaigns...");
      try {
        await runDueCampaigns();
        console.log("[Scheduler] Campaign run complete.");
      } catch (err) {
        console.error("[Scheduler] Campaign run failed:", err);
      }
    });
    console.log("[Scheduler] Cron job registered (daily at 06:00 UTC).");
  } else {
    console.log("[Scheduler] Bun.cron not available — scheduler is idle.");
    // Fallback: setInterval for environments without Bun.cron
    const HOURLY = 60 * 60 * 1000;
    setInterval(async () => {
      const now = new Date();
      if (now.getUTCHours() === 6) {
        console.log("[Scheduler] Interval triggered — running due campaigns...");
        try {
          await runDueCampaigns();
        } catch (err) {
          console.error("[Scheduler] Campaign run failed:", err);
        }
      }
    }, HOURLY);
    console.log("[Scheduler] Fallback interval registered.");
  }
}

/**
 * Manually trigger a specific campaign run.
 * Called from the API route POST /api/agents/campaigns/:id/run.
 */
export async function runCampaignNow(campaignId: string): Promise<{ runId: string }> {
  const { runPipelineForCampaign } = await import("~/agents/freight-agent");
  const runId = crypto.randomUUID();
  console.log(`[Scheduler] Manual run triggered for campaign ${campaignId} — runId: ${runId}`);
  await runPipelineForCampaign(campaignId, runId);
  return { runId };
}
