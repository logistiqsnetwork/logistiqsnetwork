import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/loads/$id")({
  component: LoadDetail,
});

function LoadDetail() {
  const { id } = Route.useParams();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Load Details</h1>
      <p className="mt-1 text-gray-600">Load ID: {id}</p>

      <div className="mt-8 space-y-4 rounded-lg border border-gray-200 p-6">
        <div>
          <span className="text-sm text-gray-500">Status</span>
          <p className="font-medium text-gray-900">Open</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Route</span>
          <p className="font-medium text-gray-900">Origin → Destination</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Cargo</span>
          <p className="font-medium text-gray-900">—</p>
        </div>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          Claim Load
        </button>
      </div>
    </main>
  );
}
