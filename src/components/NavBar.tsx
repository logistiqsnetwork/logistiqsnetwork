import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getCurrentUser, logoutUser } from "~/lib/server-fns";

interface UserInfo {
  userId: string;
  role: "shipper" | "carrier";
  displayName: string;
}

export default function NavBar() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await logoutUser();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <nav className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold text-indigo-700">
            LOGISTIQS
          </Link>
          <div className="hidden gap-4 text-sm font-medium text-gray-600 sm:flex">
            <Link
              to="/loads"
              className="hover:text-indigo-700 [&.active]:text-indigo-700"
            >
              Find Freight
            </Link>
            {user && user.role === "shipper" && (
              <Link
                to="/loads/new"
                className="hover:text-indigo-700 [&.active]:text-indigo-700"
              >
                Post a Load
              </Link>
            )}
            {user && (
              <>
                <Link
                  to="/crm"
                  className="hover:text-indigo-700 [&.active]:text-indigo-700"
                >
                  CRM
                </Link>
                <Link
                  to="/agents"
                  className="hover:text-indigo-700 [&.active]:text-indigo-700"
                >
                  Agents
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {loading ? (
            <span className="text-gray-400">…</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-gray-700">
                {user.displayName}{" "}
                <span className="text-xs text-gray-400">({user.role})</span>
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-indigo-700"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-indigo-700">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
