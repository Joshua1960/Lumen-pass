import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "host" | "attendee";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  user_metadata?: {
    display_name?: string;
    username?: string;
    phone?: string;
    [key: string]: unknown;
  };
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: AuthUser;
}

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, role?: UserRole, meta?: AuthUser["user_metadata"]) => AuthUser;
  signUp: (email: string, role: UserRole, meta?: AuthUser["user_metadata"]) => AuthUser;
  signOut: () => void;
  updateProfile: (patch: Partial<AuthUser> & { user_metadata?: AuthUser["user_metadata"] }) => void;
  validateSession: () => boolean;
  setLoading: (v: boolean) => void;
}

function buildSession(user: AuthUser): AuthSession {
  return {
    access_token: "lumen_token_" + user.id,
    token_type: "bearer",
    expires_in: 60 * 60 * 12,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
    refresh_token: "",
    user,
  };
}

function hydrateStored(): { user: AuthUser | null; session: AuthSession | null } {
  // Accept both the new zustand-persisted key and the legacy `auth_user` key
  // from the original single-role build, so existing sessions keep working.
  try {
    const legacy = localStorage.getItem("auth_user");
    if (legacy) {
      const parsed = JSON.parse(legacy) as Omit<AuthUser, "role"> & { role?: UserRole };
      const user: AuthUser = {
        id: parsed.id,
        email: parsed.email,
        role: parsed.role === "attendee" ? "attendee" : "host",
        user_metadata: parsed.user_metadata || {},
      };
      return { user, session: buildSession(user) };
    }
  } catch {
    try {
      localStorage.removeItem("auth_user");
    } catch { /* noop */ }
  }
  return { user: null, session: null };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      error: null,

      signIn: (email, role, meta) => {
        const clean = email.trim().toLowerCase();
        const stored = get().user;
        // Returning users keep their original role unless one is explicitly chosen.
        const resolvedRole: UserRole =
          role ?? (stored && stored.email === clean ? stored.role : "host");
        let display = (meta?.display_name as string) || stored?.user_metadata?.display_name || "";
        if (!display) {
          const base = clean.split("@")[0].replace(/[._-]+/g, " ");
          display = base.replace(/\b\w/g, (c) => c.toUpperCase());
        }
        const user: AuthUser = {
          id: stored && stored.email === clean ? stored.id : "user_" + clean.replace(/[^a-z0-9]/gi, "_"),
          email: clean,
          role: resolvedRole,
          user_metadata: {
            ...(stored?.user_metadata || {}),
            ...(meta || {}),
            display_name: display,
            username:
              (meta?.username as string) ||
              stored?.user_metadata?.username ||
              clean.split("@")[0],
          },
        };
        try {
          localStorage.setItem("auth_user", JSON.stringify(user));
        } catch { /* noop */ }
        set({ user, session: buildSession(user), loading: false, error: null });
        return user;
      },

      signUp: (email, role, meta) => {
        const clean = email.trim().toLowerCase();
        const base = (meta?.display_name as string) || clean.split("@")[0];
        const user: AuthUser = {
          id: "user_" + Date.now().toString(36),
          email: clean,
          role,
          user_metadata: {
            ...(meta || {}),
            display_name: base,
            username: (meta?.username as string) || clean.split("@")[0],
          },
        };
        try {
          localStorage.setItem("auth_user", JSON.stringify(user));
        } catch { /* noop */ }
        set({ user, session: buildSession(user), loading: false, error: null });
        return user;
      },

      signOut: () => {
        try {
          localStorage.removeItem("auth_user");
        } catch { /* noop */ }
        set({ user: null, session: null, loading: false, error: null });
      },

      updateProfile: (patch) => {
        const cur = get().user;
        if (!cur) return;
        const user: AuthUser = {
          ...cur,
          ...patch,
          user_metadata: {
            ...(cur.user_metadata || {}),
            ...(patch.user_metadata || {}),
          },
        };
        try {
          localStorage.setItem("auth_user", JSON.stringify(user));
        } catch { /* noop */ }
        set({ user, session: buildSession(user) });
      },

      validateSession: () => {
        const { session, user } = get();
        if (!user || !session) return false;
        const expired = session.expires_at * 1000 < Date.now();
        if (expired) {
          get().signOut();
          return false;
        }
        return true;
      },

      setLoading: (v) => set({ loading: v }),
    }),
    {
      name: "lumen_auth",
      partialize: (s) =>
        ({ user: s.user, session: s.session }) as unknown as AuthState,
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Merge the legacy key once, then mark session validation complete.
          if (!state.user) {
            const { user, session } = hydrateStored();
            if (user && session) {
              state.user = user;
              state.session = session;
              if (!state.validateSession()) {
                state.user = null;
                state.session = null;
              }
            }
          } else if (!state.validateSession()) {
            state.user = null;
            state.session = null;
          }
          state.loading = false;
        }
      },
    },
  ),
);

// First paint: resolve persisted state synchronously so protected routes
// don't flash. The persist middleware rehydrates async right after.
try {
  const raw = localStorage.getItem("lumen_auth");
  if (raw) {
    const parsed = JSON.parse(raw) as { state?: { user?: AuthUser; session?: AuthSession } };
    const u = parsed?.state?.user;
    const s = parsed?.state?.session;
    if (u && s) {
      if (s.expires_at * 1000 < Date.now()) {
        useAuthStore.setState({ user: null, session: null, loading: false });
        try { localStorage.removeItem("auth_user"); } catch { /* noop */ }
      } else {
        useAuthStore.setState({ user: u, session: s, loading: false });
      }
    } else {
      const { user, session } = hydrateStored();
      useAuthStore.setState({ user, session, loading: false });
    }
  } else {
    const { user, session } = hydrateStored();
    if (user) useAuthStore.setState({ user, session, loading: false });
    else useAuthStore.setState({ loading: false });
  }
} catch {
  useAuthStore.setState({ loading: false });
}
