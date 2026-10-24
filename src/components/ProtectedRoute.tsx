import { useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { Role } from "../lib/types";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { user, profile, profileError, loading, refreshProfile } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="gold-ring" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl text-cream mb-2">
            Profile unavailable
          </h1>
          <p className="text-sm text-[#8a8178] mb-5">
            {profileError ||
              "Your profile has not loaded, so this page cannot be opened yet."}
          </p>
          <button
            type="button"
            disabled={retrying}
            onClick={async () => {
              setRetrying(true);
              try {
                await refreshProfile();
              } finally {
                setRetrying(false);
              }
            }}
            className="btn-gold px-5 py-2.5 rounded text-sm inline-flex items-center gap-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (roles && !roles.includes(profile.role)) {
    // Redirect to their own home
    const home = profile.role === "host" ? "/dashboard" : "/my-tickets";
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
