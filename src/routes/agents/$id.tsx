import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/agents/$id")({
  component: AgentDetail,
});

function AgentDetail() {
  const { id } = Route.useParams();
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Campaign Detail</h1>
      <p className="mt-1 text-gray-600">Campaign ID: {id}</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-6 lg:col-span-1">
          <h2 className="font-semibold text-gray-900">Campaign Settings</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-gray-500">Status</dt><dd className="font-medium">Draft</dd></div>
            <div><dt className="text-gray-500">Industries</dt><dd className="font-medium">—</dd></div>
            <div><dt className="text-gray-500">Regions</dt><dd className="font-medium">—</dd></div>
            <div><dt className="text-gray-500">Schedule</dt><dd className="font-medium">Manual only</dd></div>
          </dl>
          <div className="mt-6 space-y-2">
            <button className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">Run Now</button>
            <button className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit Campaign</button>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 p-6 lg:col-span-2">
          <h2 className="font-semibold text-gray-900">Prospects</h2>
          <p className="mt-4 text-sm text-gray-500">No prospects discovered yet.</p>
        </div>
      </div>
    </main>
  );
}
