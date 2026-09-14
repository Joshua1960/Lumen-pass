import { createContext } from "react";
import type { AuthSession, AuthUser } from "../store/authStore";

interface AuthValue {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  loading: true,
});

export type { AuthUser, AuthSession };
