import { useMemo, type ReactNode } from "react";
import { AuthContext, type AuthSession, type AuthUser } from "./AuthContext";

interface LocalUser {
  id: string;
  email: string;
  user_metadata?: {
    display_name?: string;
    username?: string;
    [key: string]: unknown;
  };
}

function readStoredAuth(): {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
} {
  const storedUser = localStorage.getItem("auth_user");
  if (!storedUser) {
    return { user: null, session: null, loading: false };
  }

  try {
    const localUser = JSON.parse(storedUser) as LocalUser;
    const authUser: AuthUser = {
      id: localUser.id,
      email: localUser.email,
      user_metadata: localUser.user_metadata || {},
    };

    const authSession: AuthSession = {
      access_token: "mock_token_" + localUser.id,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "",
      user: authUser,
    };

    return { user: authUser, session: authSession, loading: false };
  } catch (error) {
    console.error("Failed to restore session:", error);
    localStorage.removeItem("auth_user");
    return { user: null, session: null, loading: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const restored = useMemo(() => readStoredAuth(), []);

  return (
    <AuthContext.Provider value={{ ...restored }}>
      {children}
    </AuthContext.Provider>
  );
}
