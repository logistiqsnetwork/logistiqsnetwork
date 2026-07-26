import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/loads/")({
  component: Loads,
});

function Loads() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Load Board</h1>
          <p className="mt-1 text-gray-600">Browse available freight loads.</p>
        </div>
      </div>

      {/* Search Filters (placeholder) */}
      <div className="mt-6 grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
        <input
          placeholder="Origin state"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Destination state"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All cargo types</option>
          <option value="dry_van">Dry Van</option>
          <option value="reefer">Reefer</option>
          <option value="flatbed">Flatbed</option>
          <option value="bulk">Bulk</option>
        </select>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
          Search
        </button>
      </div>

      {/* Load listings (placeholder) */}
      <div className="mt-8 space-y-4">
        <p className="text-center text-gray-500">No loads posted yet. Be the first!</p>
      </div>
    </main>
  );
}
