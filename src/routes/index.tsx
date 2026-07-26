import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-indigo-50 to-white px-6 py-20 text-center">
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
          Now in beta
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          The freight marketplace that grows itself
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-gray-600">
          LOGISTIQS NETWORK connects shippers with reliable carriers — powered by AI
          agents that find and onboard new partners every day, so the network gets
          more valuable for everyone.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/register"
            className="rounded-md bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Post a Load
          </Link>
          <Link
            to="/loads"
            className="rounded-md border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Find Freight
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-gray-900">How It Works</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Post",
              desc: "Shippers post loads with origin, destination, cargo details, and rate. It takes under a minute.",
            },
            {
              step: "2",
              title: "Match",
              desc: "Carriers browse open loads, filter by route and cargo type, and claim the ones that fit their fleet.",
            },
            {
              step: "3",
              title: "Ship",
              desc: "Both sides coordinate pickup and delivery. The marketplace handles the connection — you handle the freight.",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-lg border border-gray-200 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                {item.step}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 px-6 py-8 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} LOGISTIQS NETWORK. All rights reserved.
      </footer>
    </main>
  );
}
