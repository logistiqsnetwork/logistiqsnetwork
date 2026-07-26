import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getLoads, type getLoads as GetLoadsType } from "~/lib/server-fns";

type LoadItem = Awaited<ReturnType<typeof getLoads>>[number];

const CARGO_LABELS: Record<string, string> = {
  dry_van: "Dry Van",
  reefer: "Reefer",
  flatbed: "Flatbed",
  bulk: "Bulk",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  claimed: "bg-yellow-100 text-yellow-800",
  in_transit: "bg-blue-100 text-blue-800",
  delivered: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
  expired: "bg-gray-100 text-gray-500",
};

export const Route = createFileRoute("/loads/")({
  component: Loads,
});

function Loads() {
  const [loads, setLoads] = useState<LoadItem[]>([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLoads()
      .then(setLoads)
      .catch(() => setLoads([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all"
    ? loads
    : loads.filter((l) => l.status === filter);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Load Board</h1>
          <p className="mt-1 text-gray-600">Browse available freight loads.</p>
        </div>
        <Link
          to="/loads/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Post a Load
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="mt-6 flex gap-2 border-b border-gray-200 pb-3">
        {[
          { key: "open", label: "Open" },
          { key: "claimed", label: "Claimed" },
          { key: "all", label: "All" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              filter === tab.key
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Load list */}
      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">
            {filter === "open"
              ? "No open loads right now. Check back soon or post your own!"
              : filter === "claimed"
                ? "No claimed loads to show."
                : "No loads posted yet. Be the first!"}
          </p>
          {filter === "open" && (
            <Link
              to="/loads/new"
              className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Post a load →
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((load) => (
            <Link
              key={load.id}
              to="/loads/$id"
              params={{ id: load.id }}
              className="block rounded-lg border border-gray-200 bg-white p-5 hover:border-indigo-300 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {load.origin_city}, {load.origin_state}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {load.destination_city}, {load.destination_state}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-1">
                    {load.cargo_description}
                    {load.cargo_weight_lbs && (
                      <span className="ml-2 text-gray-400">
                        · {load.cargo_weight_lbs.toLocaleString()} lbs
                      </span>
                    )}
                    {load.cargo_type && (
                      <span className="ml-2 text-gray-400">
                        · {CARGO_LABELS[load.cargo_type] || load.cargo_type}
                      </span>
                    )}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span>
                      Pickup: {new Date(load.pickup_date_start).toLocaleDateString()}
                    </span>
                    {load.rate_offer && (
                      <span>
                        Rate: ${(load.rate_offer / 100).toFixed(2)}
                        {load.rate_type && load.rate_type !== "flat" && ` (${load.rate_type})`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[load.status] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {load.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-gray-400">
                    by {load.display_name}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
