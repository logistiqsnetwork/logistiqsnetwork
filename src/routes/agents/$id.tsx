import { createFileRoute, Link } from "@tanstack/react-router";
import AuthGuard from "~/components/AuthGuard";
import { getCampaign, runCampaign, getAgentActivity, getProspects, updateCampaign, getPendingOutreach, sendOutreachBatch } from "~/lib/server-fns";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/agents/$id")({
  component: AgentDetail,
});

interface Campaign {
  id: string;
  name: string;
  status: string;
  target_industries: string[];
  target_regions: string[];
  prospect_source: string;
  max_prospects: number;
  outreach_template: string | null;
  schedule_cron: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  total_prospects: number;
  total_contacted: number;
  total_responded: number;
  notes: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  duplicates: number;
  contacted: number;
}

interface Prospect {
  id: string;
  company_name_raw: string;
  industry: string;
  region: string;
  website: string;
  relevance_score: number;
  status: string;
  company_name_linked: string | null;
  company_id: string | null;
  created_at: string;
  processed_at: string | null;
}

interface ActivityItem {
  event_type: string;
  timestamp: string;
  entity_name: string;
  campaign_name: string;
  status: string;
  subject?: string;
  campaign_id: string;
}

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

function prospectStatusBadge(status: string) {
  const colors: Record<string, string> = {
    discovered: "bg-gray-100 text-gray-600",
    validated: "bg-blue-100 text-blue-700",
    company_created: "bg-green-100 text-green-700",
    contacted: "bg-purple-100 text-purple-700",
    converted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-600",
    duplicate: "bg-orange-100 text-orange-700",
  };
  return `rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`;
}

function AgentDetail() {
  const { id } = Route.useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, duplicates: 0, contacted: 0 });
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function loadData() {
    try {
      const data = await getCampaign({ id });
      if (data) {
        setCampaign(data.campaign as Campaign);
        setStats(data.stats as Stats);
      }
      const pData = await getProspects({ campaignId: id, limit: 50 });
      setProspects((pData.prospects || []) as Prospect[]);
      const act = await getAgentActivity();
      try {
        const po = await getPendingOutreach({ campaignId: id });
        setPendingOutreach(po as any[]);
      } catch (_) {
        setPendingOutreach([]);
      }
      setActivity(((act as ActivityItem[]) || []).filter((a) => a.campaign_id === id));
    } catch (err) {
      console.error("Failed to load campaign:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [id]);

  async function handleRun() {
    setRunning(true);
    try {
      await runCampaign({ id });
      await loadData();
    } catch (err) {
      console.error("Failed to run campaign:", err);
    } finally {
      setRunning(false);
    }
  }

  async function handleActivate() {
    try {
      await updateCampaign({ id, status: "running" });
      await loadData();
    } catch (err) {
      console.error("Failed to activate campaign:", err);
    }
  }

  const formatTime = (ts: string | null) => {
    if (!ts) return "\u2014";
    return new Date(ts).toLocaleString();
  };

  if (loading) {
    return (
      <AuthGuard>
        <main className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-gray-500">Loading campaign...</p>
        </main>
      </AuthGuard>
    );
  }

  if (!campaign) {
    return (
      <AuthGuard>
        <main className="mx-auto max-w-6xl px-6 py-12">
          <h1 className="text-2xl font-bold text-gray-900">Campaign Not Found</h1>
          <Link to="/agents" className="mt-4 inline-block text-indigo-600 hover:underline">
            &larr; Back to campaigns
          </Link>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <Link to="/agents" className="text-sm text-indigo-600 hover:underline">
          &larr; Back to campaigns
        </Link>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {(campaign.target_industries || []).join(", ")} &middot;{" "}
                {(campaign.target_regions || []).join(", ")}
                {campaign.schedule_cron && <span className="ml-2">Schedule: {campaign.schedule_cron}</span>}
              </p>
            </div>
            <span className={statusBadge(campaign.status)}>{campaign.status}</span>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Total Prospects</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{campaign.total_prospects}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Contacted</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{campaign.total_contacted}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Responded</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{campaign.total_responded}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Active Prospects</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.active || 0}</p>
            </div>
          </div>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-6 lg:col-span-1">
            <h2 className="font-semibold text-gray-900">Campaign Settings</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="text-gray-500">Status</dt><dd className="font-medium capitalize">{campaign.status}</dd></div>
              <div><dt className="text-gray-500">Industries</dt><dd className="font-medium">{(campaign.target_industries || []).join(", ") || "All"}</dd></div>
              <div><dt className="text-gray-500">Regions</dt><dd className="font-medium">{(campaign.target_regions || []).join(", ") || "All"}</dd></div>
              <div><dt className="text-gray-500">Max Prospects</dt><dd className="font-medium">{campaign.max_prospects}</dd></div>
              <div><dt className="text-gray-500">Source</dt><dd className="font-medium">{campaign.prospect_source}</dd></div>
              <div><dt className="text-gray-500">Schedule</dt><dd className="font-medium">{campaign.schedule_cron || "Manual only"}</dd></div>
              <div><dt className="text-gray-500">Last Run</dt><dd className="font-medium">{formatTime(campaign.last_run_at)}</dd></div>
              <div><dt className="text-gray-500">Next Run</dt><dd className="font-medium">{formatTime(campaign.next_run_at)}</dd></div>
              <div><dt className="text-gray-500">Created</dt><dd className="font-medium">{formatTime(campaign.created_at)}</dd></div>
            </dl>
            <div className="mt-6 space-y-2">
              <button onClick={handleRun} disabled={running} className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
                {running ? "Running..." : "Run Now"}
              </button>
              {campaign.status === "draft" && (
                <button onClick={handleActivate} className="w-full rounded-md border border-green-300 px-4 py-2 text-sm text-green-700 hover:bg-green-50">
                  Activate (Set to Running)
                </button>
              )}
            </div>
            {campaign.notes && (
              <div className="mt-4 rounded-md bg-gray-50 p-3">
                <p className="text-xs text-gray-600">{campaign.notes}</p>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-gray-200 p-6 lg:col-span-2">
            <h2 className="font-semibold text-gray-900">Prospects ({prospects.length})</h2>
            {prospects.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No prospects discovered yet. Click "Run Now" to start the discovery pipeline.</p>
            ) : (
              <div className="mt-4 divide-y divide-gray-100">
                {prospects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {p.company_id ? (
                          <Link to="/companies/$id" params={{ id: p.company_id }} className="font-medium text-gray-900 hover:text-indigo-700 truncate">{p.company_name_raw}</Link>
                        ) : (
                          <span className="font-medium text-gray-900 truncate">{p.company_name_raw}</span>
                        )}
                        <span className={prospectStatusBadge(p.status)}>{p.status.replace("_", " ")}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                        {p.industry && <span>{p.industry}</span>}
                        {p.region && <span>&middot; {p.region}</span>}
                        {p.website && <a href={`https://${p.website}`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">{p.website}</a>}
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      <span className="text-xs text-gray-400">Score: {p.relevance_score != null ? Number(p.relevance_score).toFixed(2) : "\u2014"}</span>
                      <span className="text-xs text-gray-400">{formatTime(p.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Review & Send Pending Outreach */}
        {pendingOutreach.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Review & Send ({pendingOutreach.length} pending)
              </h2>
              {selectedOutreach.size > 0 && (
                <button
                  onClick={handleSendSelected}
                  disabled={sending}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {sending ? "Sending..." : `Send Selected (${selectedOutreach.size})`}
                </button>
              )}
            </div>
            <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
              {pendingOutreach.map((o: any) => (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedOutreach.has(o.id)}
                    onChange={() => toggleSelect(o.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {o.company_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        &middot; {o.contact_name || "No contact"}
                      </span>
                    </div>
                    {o.subject && (
                      <p className="text-xs text-gray-500 truncate">
                        {o.subject}
                      </p>
                    )}
                    {o.contact_email && (
                      <p className="text-xs text-indigo-500">{o.contact_email}</p>
                    )}
                  </div>
                  <Link
                    to="/companies/$id"
                    params={{ id: o.company_id }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                  >
                    View Company
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Activity</h2>
          {activity.length === 0 ? (
            <div className="mt-4 rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">No activity recorded yet.</div>
          ) : (
            <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
              {activity.map((a, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 text-sm">
                  <span className={`inline-block h-2 w-2 rounded-full ${a.event_type === "outreach_drafted" ? "bg-green-400" : "bg-blue-400"}`} />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{a.entity_name}</span>
                    <span className="mx-1 text-gray-400">&middot;</span>
                    <span className="text-gray-500">{a.event_type === "outreach_drafted" ? `Outreach \u2014 ${a.subject || a.status}` : `Prospect ${a.status}`}</span>
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
