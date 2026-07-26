import { useEffect, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import AuthGuard from "~/components/AuthGuard";
import {
  getCompanies,
  getCRMStats,
  createCompany,
  type CompanyRow,
} from "~/lib/server-fns";

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  contacted: "Contacted",
  engaged: "Engaged",
  registered: "Registered",
  active: "Active",
  churned: "Churned",
};

const STAGE_COLORS: Record<string, string> = {
  lead: "border-gray-300",
  contacted: "border-blue-300",
  engaged: "border-indigo-300",
  registered: "border-green-300",
  active: "border-green-500",
  churned: "border-red-300",
};

const STAGES = ["lead", "contacted", "engaged", "registered", "active", "churned"];

const INDUSTRY_LABELS: Record<string, string> = {
  mining: "Mining",
  manufacturing: "Manufacturing",
  agriculture: "Agriculture",
  retail_distribution: "Retail Distribution",
};

const TYPE_LABELS: Record<string, string> = {
  shipper: "Shipper",
  carrier: "Carrier",
  broker: "Broker",
  prospect: "Prospect",
  other: "Other",
};

export const Route = createFileRoute("/crm")({
  component: CRM,
});

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function CRM() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    byStage: { onboarding_stage: string; count: number }[];
    outreachThisWeek: number;
    followUpsDue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company_type: "prospect",
    industry: "",
    phone: "",
    address_line1: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    website: "",
    source: "manual",
    notes: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([getCompanies(), getCRMStats()]);
      setCompanies(c as CompanyRow[]);
      setStats(s as typeof stats);
    } catch (err) {
      console.error("Failed to load CRM data:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stageCounts: Record<string, number> = {};
  for (const s of STAGES) stageCounts[s] = 0;
  if (stats?.byStage) {
    for (const row of stats.byStage) {
      stageCounts[row.onboarding_stage] = row.count;
    }
  }

  const companyByStage: Record<string, CompanyRow[]> = {};
  for (const s of STAGES) companyByStage[s] = [];
  for (const c of companies) {
    if (companyByStage[c.onboarding_stage]) {
      companyByStage[c.onboarding_stage].push(c);
    }
  }

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setFormSubmitting(true);
    try {
      const result = await createCompany(formData);
      setShowAddModal(false);
      setFormData({
        name: "",
        company_type: "prospect",
        industry: "",
        phone: "",
        address_line1: "",
        address_city: "",
        address_state: "",
        address_zip: "",
        website: "",
        source: "manual",
        notes: "",
      });
      await loadData();
    } catch (err) {
      console.error("Failed to create company:", err);
    }
    setFormSubmitting(false);
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CRM Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Pipeline overview and follow-up tracking.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add Company
          </button>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Total Companies</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats?.total ?? 0}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Outreach This Week</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {stats?.outreachThisWeek ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Follow-ups Due (7d)</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {stats?.followUpsDue ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Engaged + Registered</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {(stageCounts.engaged || 0) + (stageCounts.registered || 0) + (stageCounts.active || 0)}
            </p>
          </div>
        </div>

        {/* Pipeline View */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pipeline</h2>
            <Link
              to="/companies"
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              View all companies →
            </Link>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-6">
            {STAGES.map((stage) => (
              <div
                key={stage}
                className={`rounded-lg border-t-4 ${STAGE_COLORS[stage]} bg-gray-50 p-4`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {STAGE_LABELS[stage]}
                  </h3>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {stageCounts[stage] || 0}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {companyByStage[stage].length === 0 ? (
                    <p className="py-3 text-center text-xs text-gray-400">
                      No companies
                    </p>
                  ) : (
                    companyByStage[stage].map((c) => (
                      <Link
                        key={c.id}
                        to="/companies/$id"
                        params={{ id: c.id }}
                        className="block rounded-lg border border-gray-200 bg-white p-3 transition hover:shadow-sm"
                      >
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {c.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          {c.industry && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5">
                              {INDUSTRY_LABELS[c.industry] || c.industry}
                            </span>
                          )}
                          {c.last_contact_date && (
                            <span>Last: {formatDate(c.last_contact_date)}</span>
                          )}
                        </div>
                        {c.next_follow_up && (
                          <p className="mt-1 text-xs text-indigo-600">
                            Next: {formatDate(c.next_follow_up)}
                          </p>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Upcoming Follow-ups
          </h2>
          {companies.filter(
            (c) => c.next_follow_up != null
          ).length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No follow-ups due.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {companies
                .filter((c) => c.next_follow_up != null)
                .sort(
                  (a, b) =>
                    new Date(a.next_follow_up!).getTime() -
                    new Date(b.next_follow_up!).getTime()
                )
                .slice(0, 10)
                .map((c) => (
                  <Link
                    key={c.id}
                    to="/companies/$id"
                    params={{ id: c.id }}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition hover:shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {c.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {STAGE_LABELS[c.onboarding_stage]}
                      </p>
                    </div>
                    <span className="text-xs text-indigo-600 font-medium">
                      {formatDate(c.next_follow_up)}
                    </span>
                  </Link>
                ))}
            </div>
          )}
        </div>

        {/* Add Company Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Add Company
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddCompany} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <select
                      value={formData.company_type}
                      onChange={(e) =>
                        setFormData({ ...formData, company_type: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="prospect">Prospect</option>
                      <option value="shipper">Shipper</option>
                      <option value="carrier">Carrier</option>
                      <option value="broker">Broker</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Industry
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) =>
                        setFormData({ ...formData, industry: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">—</option>
                      <option value="mining">Mining</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="agriculture">Agriculture</option>
                      <option value="retail_distribution">
                        Retail Distribution
                      </option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address_line1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address_line1: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.address_city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address_city: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.address_state}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address_state: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      maxLength={2}
                      placeholder="TX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ZIP
                    </label>
                    <input
                      type="text"
                      value={formData.address_zip}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address_zip: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={2}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {formSubmitting ? "Adding..." : "Add Company"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
