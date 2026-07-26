import { createFileRoute } from "@tanstack/react-router";
import AuthGuard from "~/components/AuthGuard";

export const Route = createFileRoute("/crm")({
  component: CRM,
});

function CRM() {
  const stats = [
    { label: "Total Prospects", value: "—" },
    { label: "Outreach Pending", value: "—" },
    { label: "Follow-ups Due (7d)", value: "—" },
    { label: "New This Week", value: "—" },
  ];

  const stages = ["Lead", "Contacted", "Engaged", "Registered"];

  return (
    <AuthGuard>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">CRM Dashboard</h1>
        <p className="mt-1 text-gray-600">Pipeline overview and follow-up tracking.</p>

        {/* Stats Row */}
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Pipeline View */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Pipeline</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            {stages.map((stage) => (
              <div key={stage} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-700">{stage}</h3>
                <p className="mt-4 text-center text-sm text-gray-400">No companies</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Follow-ups</h2>
          <p className="mt-4 text-sm text-gray-500">No follow-ups due.</p>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <p className="mt-4 text-sm text-gray-500">No recent activity.</p>
        </div>
      </main>
    </AuthGuard>
  );
}
