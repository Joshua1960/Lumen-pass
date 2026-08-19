import { useState, useEffect, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AuthContext } from "./AuthContext";

// Simple local user type for development
interface LocalUser {
  id: string;
  email: string;
  user_metadata?: {
    display_name: string;
  };
}

// Convert local user to Supabase User type for compatibility
const localUserToSupabaseUser = (localUser: LocalUser): User => ({
  id: localUser.id,
  aud: "authenticated",
  role: "authenticated",
  email: localUser.email,
  email_confirmed_at: new Date().toISOString(),
  phone: "",
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: localUser.user_metadata || {},
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
      try {
        const localUser = JSON.parse(storedUser) as LocalUser;
        const supabaseUser = localUserToSupabaseUser(localUser);
        const mockSession: Session = {
          access_token: "mock_token_" + localUser.id,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "",
          user: supabaseUser,
        };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(supabaseUser);
        setSession(mockSession);
      } catch (e) {
        console.error("Failed to restore session:", e);
        localStorage.removeItem("auth_user");
      }
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
