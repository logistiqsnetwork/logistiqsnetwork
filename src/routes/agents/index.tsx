import { createFileRoute } from "@tanstack/react-router";
import AuthGuard from "~/components/AuthGuard";

export const Route = createFileRoute("/agents/")({
  component: Agents,
});

function Agents() {
  return (
    <AuthGuard>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Campaigns</h1>
            <p className="mt-1 text-gray-600">
              AI-powered freight acquisition — discover, validate, and draft outreach.
            </p>
          </div>
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
            + New Campaign
          </button>
        </div>

        {/* Campaign List */}
        <div className="mt-8 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Starter Campaign</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Mining, Manufacturing, Agriculture, Retail — Midwest
                </p>
              </div>
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                Draft
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Prospects</span>
                <p className="font-semibold text-gray-900">0</p>
              </div>
              <div>
                <span className="text-gray-500">Contacted</span>
                <p className="font-semibold text-gray-900">0</p>
              </div>
              <div>
                <span className="text-gray-500">Responded</span>
                <p className="font-semibold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Agent Activity */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <div className="mt-4 rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
            The agent scheduler is idle. Create a campaign and set it to "running" to start discovery.
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
