import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { useAuthStore } from "../store/authStore";

/**
 * Thin bridge: the original Context API now reads from the unified Zustand
 * session store, so every existing `useAuth()` consumer keeps working while
 * session validation lives in one place.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
