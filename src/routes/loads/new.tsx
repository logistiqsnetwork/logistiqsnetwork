import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createLoad } from "~/lib/server-fns";
import AuthGuard from "~/components/AuthGuard";

export const Route = createFileRoute("/loads/new")({
  component: NewLoadPage,
});

function NewLoadPage() {
  return (
    <AuthGuard role="shipper">
      <NewLoadForm />
    </AuthGuard>
  );
}

function NewLoadForm() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);

    const data = {
      origin_address: (form.get("origin_address") as string) || "",
      origin_city: (form.get("origin_city") as string) || "",
      origin_state: (form.get("origin_state") as string) || "",
      origin_zip: (form.get("origin_zip") as string) || "",
      destination_address: (form.get("destination_address") as string) || "",
      destination_city: (form.get("destination_city") as string) || "",
      destination_state: (form.get("destination_state") as string) || "",
      destination_zip: (form.get("destination_zip") as string) || "",
      cargo_description: (form.get("cargo_description") as string) || "",
      cargo_type: (form.get("cargo_type") as string) || undefined,
      cargo_weight_lbs: form.get("cargo_weight_lbs")
        ? parseInt(form.get("cargo_weight_lbs") as string, 10)
        : undefined,
      pickup_date_start: (form.get("pickup_date_start") as string) || "",
      pickup_date_end: (form.get("pickup_date_end") as string) || undefined,
      delivery_date_start: (form.get("delivery_date_start") as string) || undefined,
      delivery_date_end: (form.get("delivery_date_end") as string) || undefined,
      rate_offer: form.get("rate_offer")
        ? Math.round(parseFloat(form.get("rate_offer") as string) * 100)
        : undefined,
      rate_type: (form.get("rate_type") as string) || "flat",
    };

    // Validate required fields
    if (
      !data.origin_city || !data.origin_state ||
      !data.destination_city || !data.destination_state ||
      !data.cargo_description || !data.pickup_date_start
    ) {
      setError("Please fill in all required fields (origin city/state, destination city/state, cargo description, and pickup date).");
      setSubmitting(false);
      return;
    }

    try {
      const result = await createLoad({ data });
      navigate({ to: "/loads/$id", params: { id: result.id } });
    } catch (err: any) {
      setError(err.message || "Failed to create load. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Post a Load</h1>
      <p className="mt-1 text-gray-600">Fill in the details for your shipment.</p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Origin */}
        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="text-sm font-semibold text-gray-700">
            Origin <span className="text-red-500">*</span>
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              name="origin_address"
              placeholder="Address"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              name="origin_city"
              placeholder="City"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              name="origin_state"
              placeholder="State (e.g. TX)"
              required
              maxLength={2}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              name="origin_zip"
              placeholder="ZIP"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </fieldset>

        {/* Destination */}
        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="text-sm font-semibold text-gray-700">
            Destination <span className="text-red-500">*</span>
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              name="destination_address"
              placeholder="Address"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              name="destination_city"
              placeholder="City"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              name="destination_state"
              placeholder="State (e.g. CA)"
              required
              maxLength={2}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              name="destination_zip"
              placeholder="ZIP"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </fieldset>

        {/* Cargo Details */}
        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="text-sm font-semibold text-gray-700">
            Cargo Details <span className="text-red-500">*</span>
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              name="cargo_description"
              placeholder="Description"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              name="cargo_weight_lbs"
              placeholder="Weight (lbs)"
              type="number"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <select
              name="cargo_type"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Cargo type</option>
              <option value="dry_van">Dry Van</option>
              <option value="reefer">Reefer</option>
              <option value="flatbed">Flatbed</option>
              <option value="bulk">Bulk</option>
            </select>
          </div>
        </fieldset>

        {/* Dates */}
        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="text-sm font-semibold text-gray-700">
            Pickup & Delivery
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-gray-500">Pickup date <span className="text-red-500">*</span></label>
              <input
                name="pickup_date_start"
                type="date"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Pickup date end</label>
              <input
                name="pickup_date_end"
                type="date"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Delivery date</label>
              <input
                name="delivery_date_start"
                type="date"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Delivery date end</label>
              <input
                name="delivery_date_end"
                type="date"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Rate */}
        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="text-sm font-semibold text-gray-700">Rate</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-gray-500">Amount (USD)</label>
              <input
                name="rate_offer"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Rate type</label>
              <select
                name="rate_type"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="flat">Flat</option>
                <option value="per_mile">Per Mile</option>
                <option value="negotiable">Negotiable</option>
              </select>
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Post Load"}
        </button>
      </form>
    </main>
  );
}
