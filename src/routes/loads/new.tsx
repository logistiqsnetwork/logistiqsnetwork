import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/loads/new")({
  component: NewLoad,
});

function NewLoad() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Post a Load</h1>
      <p className="mt-1 text-gray-600">Fill in the details for your shipment.</p>

      <form className="mt-8 space-y-6">
        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="text-sm font-semibold text-gray-700">Origin</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input placeholder="Address" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="City" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="State" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="ZIP" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="text-sm font-semibold text-gray-700">Destination</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input placeholder="Address" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="City" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="State" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="ZIP" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="text-sm font-semibold text-gray-700">Cargo Details</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input placeholder="Description" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Weight (lbs)" type="number" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Cargo type</option>
              <option value="dry_van">Dry Van</option>
              <option value="reefer">Reefer</option>
              <option value="flatbed">Flatbed</option>
              <option value="bulk">Bulk</option>
            </select>
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-md bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700"
        >
          Post Load
        </button>
      </form>
    </main>
  );
}
