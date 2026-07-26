import { useEffect, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import AuthGuard from "~/components/AuthGuard";
import { getCompanies, type CompanyRow } from "~/lib/server-fns";

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  contacted: "Contacted",
  engaged: "Engaged",
  registered: "Registered",
  active: "Active",
  churned: "Churned",
};

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  engaged: "bg-indigo-100 text-indigo-800",
  registered: "bg-green-100 text-green-800",
  active: "bg-green-200 text-green-900",
  churned: "bg-red-100 text-red-800",
};

const TYPE_LABELS: Record<string, string> = {
  shipper: "Shipper",
  carrier: "Carrier",
  broker: "Broker",
  prospect: "Prospect",
  other: "Other",
};

const INDUSTRY_LABELS: Record<string, string> = {
  mining: "Mining",
  manufacturing: "Manufacturing",
  agriculture: "Agriculture",
  retail_distribution: "Retail Distribution",
};

export const Route = createFileRoute("/companies/")({
  component: Companies,
});

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Companies() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortField, setSortField] = useState<keyof CompanyRow>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (search.trim()) filters.search = search.trim();
      if (stageFilter) filters.stage = stageFilter;
      if (industryFilter) filters.industry = industryFilter;
      if (typeFilter) filters.company_type = typeFilter;

      const rows = await getCompanies(filters);
      setCompanies(rows as CompanyRow[]);
    } catch (err) {
      console.error("Failed to load companies:", err);
    }
    setLoading(false);
  }, [search, stageFilter, industryFilter, typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sorted = [...companies].sort((a, b) => {
    const aVal = a[sortField] ?? "";
    const bVal = b[sortField] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(field: keyof CompanyRow) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: keyof CompanyRow }) {
    if (sortField !== field) return <span className="ml-1 text-gray-300">↕</span>;
    return (
      <span className="ml-1 text-indigo-600">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  return (
    <AuthGuard>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
            <p className="mt-1 text-sm text-gray-600">
              CRM — manage shipper and carrier prospects.
            </p>
          </div>
          <Link
            to="/crm"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            ← Pipeline View
          </Link>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Stages</option>
            {Object.entries(STAGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Industries</option>
            {Object.entries(INDUSTRY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {(search || stageFilter || industryFilter || typeFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setStageFilter("");
                setIndustryFilter("");
                setTypeFilter("");
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 font-medium text-gray-700 hover:text-indigo-700"
                  onClick={() => toggleSort("name")}
                >
                  Company <SortIcon field="name" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 font-medium text-gray-700 hover:text-indigo-700"
                  onClick={() => toggleSort("company_type")}
                >
                  Type <SortIcon field="company_type" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 font-medium text-gray-700 hover:text-indigo-700"
                  onClick={() => toggleSort("industry")}
                >
                  Industry <SortIcon field="industry" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 font-medium text-gray-700 hover:text-indigo-700"
                  onClick={() => toggleSort("onboarding_stage")}
                >
                  Stage <SortIcon field="onboarding_stage" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 font-medium text-gray-700 hover:text-indigo-700"
                  onClick={() => toggleSort("last_contact_date")}
                >
                  Last Contact <SortIcon field="last_contact_date" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    {search || stageFilter || industryFilter || typeFilter
                      ? "No companies match your filters."
                      : "No companies yet. Add one from the CRM dashboard."}
                  </td>
                </tr>
              ) : (
                sorted.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to="/companies/$id"
                        params={{ id: c.id }}
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {TYPE_LABELS[c.company_type] || c.company_type}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.industry
                        ? INDUSTRY_LABELS[c.industry] || c.industry
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          STAGE_COLORS[c.onboarding_stage] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {STAGE_LABELS[c.onboarding_stage] || c.onboarding_stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(c.last_contact_date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-xs text-gray-400">
          {companies.length} company{companies.length !== 1 ? "ies" : "y"} total
        </p>
      </main>
    </AuthGuard>
  );
}
