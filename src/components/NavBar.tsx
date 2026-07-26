import { Link } from "@tanstack/react-router";

export default function NavBar() {
  return (
    <nav className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold text-indigo-700">
            LOGISTIQS
          </Link>
          <div className="hidden gap-4 text-sm font-medium text-gray-600 sm:flex">
            <Link to="/loads" className="hover:text-indigo-700 [&.active]:text-indigo-700">
              Loads
            </Link>
            <Link to="/companies" className="hover:text-indigo-700 [&.active]:text-indigo-700">
              CRM
            </Link>
            <Link to="/agents" className="hover:text-indigo-700 [&.active]:text-indigo-700">
              Agents
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/login" className="text-gray-600 hover:text-indigo-700">
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
          >
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  );
}
