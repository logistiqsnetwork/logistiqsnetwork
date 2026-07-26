import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/companies/")({
  component: Companies,
});

function Companies() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
      <p className="mt-1 text-gray-600">CRM — manage shipper and carrier prospects.</p>

      {/* Placeholder table */}
      <div className="mt-8 overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Company</th>
              <th className="px-4 py-3 font-medium text-gray-700">Type</th>
              <th className="px-4 py-3 font-medium text-gray-700">Stage</th>
              <th className="px-4 py-3 font-medium text-gray-700">Industry</th>
              <th className="px-4 py-3 font-medium text-gray-700">Last Contact</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                No companies yet. The AI agent will start discovering prospects soon.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
