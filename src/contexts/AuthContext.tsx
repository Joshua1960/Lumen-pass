import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import supabase from "../lib/supabase";
import type { Profile, Role } from "../lib/types";
import { readApiResponse } from "../lib/api";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: Role,
  ) => Promise<{ emailConfirmationRequired: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
export const AuthContext = Ctx;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    setProfileError(null);
    try {
      const res = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
        },
      });
      const data = await readApiResponse(res);
      if (!res.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : `Profile request failed (${res.status}).`;
        throw new Error(message);
      }
      setProfile(data as Profile);
      setProfileError(null);
    } catch (error) {
      setProfile(null);
      setProfileError(
        error instanceof Error ? error.message : "Unable to load your profile",
      );
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!mounted) return;
        if (error) throw error;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        await loadProfile(data.session?.user ?? null);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setProfileError(
          error instanceof Error ? error.message : "Unable to load your session",
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, sess) => {
      if (!mounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);

      // Supabase auth callbacks run while its auth lock is held. Defer profile
      // loading because loadProfile reads the session from the auth client.
      window.setTimeout(() => {
        if (!mounted) return;
        void loadProfile(sess?.user ?? null).finally(() => {
          if (mounted) setLoading(false);
        });
      }, 0);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: Role,
  ): Promise<{ emailConfirmationRequired: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, role } },
    });
    if (error) throw error;
    // If email confirmation is disabled, session exists — create profile immediately.
    if (data.session) {
      const token = data.session.access_token;
      await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ display_name: displayName, role, email }),
      });
    }
    return { emailConfirmationRequired: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };
  const refreshProfile = async () => {
    await loadProfile(user);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        profile,
        profileError,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
