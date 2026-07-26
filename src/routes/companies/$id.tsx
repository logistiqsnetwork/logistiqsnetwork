import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/companies/$id")({
  component: CompanyDetail,
});

function CompanyDetail() {
  const { id } = Route.useParams();
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Company Detail</h1>
      <p className="mt-1 text-gray-600">Company ID: {id}</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Company Info</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-gray-500">Name</dt><dd className="font-medium text-gray-900">—</dd></div>
            <div><dt className="text-gray-500">Type</dt><dd className="font-medium text-gray-900">—</dd></div>
            <div><dt className="text-gray-500">Stage</dt><dd className="font-medium text-gray-900">—</dd></div>
            <div><dt className="text-gray-500">Industry</dt><dd className="font-medium text-gray-900">—</dd></div>
            <div><dt className="text-gray-500">Website</dt><dd className="font-medium text-gray-900">—</dd></div>
          </dl>
        </div>
        <div className="rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
          <p className="mt-4 text-sm text-gray-500">No contacts added yet.</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">Outreach Timeline</h2>
          <p className="mt-4 text-sm text-gray-500">No outreach records yet.</p>
        </div>
      </div>
    </main>
  );
}
