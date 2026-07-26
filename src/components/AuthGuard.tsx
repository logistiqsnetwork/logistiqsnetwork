import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getCurrentUser } from "~/lib/server-fns";

interface AuthGuardProps {
  children: ReactNode;
  /** If set, also checks the user's role */
  role?: "shipper" | "carrier";
  /** Where to redirect unauthenticated users */
  redirectTo?: string;
}

export default function AuthGuard({
  children,
  role,
  redirectTo = "/login",
}: AuthGuardProps) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((user) => {
      if (cancelled) return;
      if (!user) {
        navigate({ to: redirectTo });
        return;
      }
      if (role && user.role !== role) {
        navigate({ to: "/" });
        return;
      }
      setAuthorized(true);
      setChecking(false);
    }).catch(() => {
      if (!cancelled) {
        navigate({ to: redirectTo });
      }
    });
    return () => { cancelled = true; };
  }, [navigate, role, redirectTo]);

  if (checking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!authorized) return null;
  return <>{children}</>;
}
