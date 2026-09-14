import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import type { UserRole } from "../store/authStore";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <div className="gold-ring" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // Role gate: attendees landing on host-only doors are sent to their
  // invitations; hosts landing on attendee-only doors go to the desk.
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <Navigate
        to={user.role === "attendee" ? "/my-invitations" : "/dashboard"}
        replace
      />
    );
  }
  return <>{children}</>;
}
