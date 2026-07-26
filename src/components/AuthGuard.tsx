import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

interface AuthGuardProps {
  children: ReactNode;
  role?: "shipper" | "carrier";
}

/**
 * Client-side auth guard wrapper.
 * Redirects to /login if no session cookie is present.
 * In the MVP, this is a lightweight client-side check — actual auth
 * enforcement happens server-side via requireAuth().
 */
export default function AuthGuard({ children, role }: AuthGuardProps) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check for session cookie presence (shallow client-side check)
    const hasSession = document.cookie.includes("session_id=");
    if (!hasSession) {
      navigate({ to: "/login" });
    }
    setChecked(true);
  }, [navigate]);

  if (!checked) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
