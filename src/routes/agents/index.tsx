import { createFileRoute, Link } from "@tanstack/react-router";
import AuthGuard from "~/components/AuthGuard";
import { getCampaigns, createCampaign, getAgentActivity, runCampaign } from "~/lib/server-fns";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/agents/")({
  component: Agents,
});

interface Campaign {
  id: string;
  name: string;
  status: string;
  target_industries: string[];
  target_regions: string[];
  prospect_source: string;
  max_prospects: number;
  total_prospects: number;
  total_contacted: number;
  total_responded: number;
  last_run_at: string | null;
  next_run_at: string | null;
  schedule_cron: string | null;
  created_at: string;
}

interface Activity {
  event_type: string;
  timestamp: string;
  entity_name: string;
  campaign_name: string;
  status: string;
  subject?: string;
  campaign_id: string;
}

const INDUSTRY_OPTIONS = [
  "mining", "manufacturing", "agriculture", "retail_distribution"
];

const REGION_OPTIONS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    running: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    completed: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
  };
  return `rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`;
}

function Agents() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [running, setRunning] = useState<Record<string, boolean>>({});

  // Form state
  const [formName, setFormName] = useState("");
  const [formIndustries, setFormIndustries] = useState<string[]>(["mining"]);
  const [formRegions, setFormRegions] = useState<string[]>(["US"]);
  const [formMaxProspects, setFormMaxProspects] = useState(20);
  const [formSchedule, setFormSchedule] = useState("");

  async function loadData() {
    try {
      const [c, a] = await Promise.all([getCampaigns(), getAgentActivity()]);
      setCampaigns(c as Campaign[]);
      setActivity(a as Activity[]);
    } catch (err) {
      console.error("Failed to load agent data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    try {
      await createCampaign({
        name: formName.trim(),
        target_industries: formIndustries,
        target_regions: formRegions,
        max_prospects: formMaxProspects,
        schedule_cron: formSchedule || null,
        status: "draft",
      });
      setShowForm(false);
      setFormName("");
      setFormIndustries(["mining"]);
      setFormRegions(["US"]);
      setFormMaxProspects(20);
      setFormSchedule("");
      await loadData();
    } catch (err) {
      console.error("Failed to create campaign:", err);
    }
  }

  async function handleRun(campaignId: string) {
    setRunning((prev) => ({ ...prev, [campaignId]: true }));
    try {
      await runCampaign({ id: campaignId });
      await loadData();
    } catch (err) {
      console.error("Failed to run campaign:", err);
    } finally {
      setRunning((prev) => ({ ...prev, [campaignId]: false }));
    }
  }

  function toggleIndustry(industry: string) {
    setFormIndustries((prev) =>
      prev.includes(industry) ? prev.filter((i) => i !== industry) : [...prev, industry]
    );
  }

  function toggleRegion(region: string) {
    setFormRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  }

  const formatTime = (ts: string | null) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleString();
  };

  return (
    <AuthGuard>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Campaigns</h1>
            <p className="mt-1 text-gray-600">
              AI-powered freight acquisition — discover, validate, and draft outreach.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            + New Campaign
          </button>
        </div>

        {/* New Campaign Form */}
        {showForm && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Create Campaign</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Midwest Manufacturers — Q3 2026"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Target Industries</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => toggleIndustry(ind)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        formIndustries.includes(ind)
                          ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                          : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      {ind.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Target Regions{" "}
                  <span className="font-normal text-gray-400">
                    (use &quot;US&quot; for nationwide)
                  </span>
                </label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {["US", ...REGION_OPTIONS.slice(0, 12)].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleRegion(r)}
                      className={`rounded px-2 py-0.5 text-xs ${
                        formRegions.includes(r)
                          ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                          : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Prospects</label>
                  <input
                    type="number"
                    value={formMaxProspects}
                    onChange={(e) => setFormMaxProspects(parseInt(e.target.value) || 20)}
                    min={1}
                    max={200}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Schedule (cron){" "}
                    <span className="font-normal text-gray-400">optional</span>
                  </label>
                  <input
                    type="text"
                    value={formSchedule}
                    onChange={(e) => setFormSchedule(e.target.value)}
                    placeholder="0 6 * * * (daily at 6AM)"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  Create Campaign
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Campaign List */}
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
              Loading campaigns...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
              No campaigns yet. Create one to start AI-powered freight acquisition.
            </div>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Link
                      to="/agents/$id"
                      params={{ id: c.id }}
                      className="font-semibold text-gray-900 hover:text-indigo-700"
                    >
                      {c.name}
                    </Link>
                    <p className="mt-1 text-sm text-gray-500">
                      {(c.target_industries || []).join(", ") || "All industries"} &middot;{" "}
                      {(c.target_regions || []).join(", ") || "All regions"}
                      {c.schedule_cron && (
                        <span className="ml-2 text-gray-400">Schedule: {c.schedule_cron}</span>
                      )}
                    </p>
                  </div>
                  <span className={statusBadge(c.status)}>{c.status}</span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Prospects</span>
                    <p className="font-semibold text-gray-900">{c.total_prospects}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Contacted</span>
                    <p className="font-semibold text-gray-900">{c.total_contacted}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Responded</span>
                    <p className="font-semibold text-gray-900">{c.total_responded}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Run</span>
                    <p className="font-semibold text-gray-900 text-xs">
                      {formatTime(c.last_run_at)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleRun(c.id)}
                    disabled={running[c.id]}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {running[c.id] ? "Running..." : "Run Now"}
                  </button>
                  <Link
                    to="/agents/$id"
                    params={{ id: c.id }}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Agent Activity */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Recent Agent Activity</h2>
          {activity.length === 0 ? (
            <div className="mt-4 rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
              No agent activity yet. Create a campaign and click &quot;Run Now&quot; to start discovery.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
              {activity.slice(0, 15).map((a, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 text-sm">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      a.event_type === "outreach_drafted" ? "bg-green-400" : "bg-blue-400"
                    }`}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{a.entity_name}</span>
                    <span className="mx-1 text-gray-400">·</span>
                    <span className="text-gray-500">
                      {a.event_type === "outreach_drafted"
                        ? `Outreach draft — ${a.status}`
                        : `Prospect ${a.status}`}
                    </span>
                    {a.campaign_name && (
                      <span className="ml-2 text-xs text-gray-400">({a.campaign_name})</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{formatTime(a.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
