import { createContext } from "react";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    display_name?: string;
    username?: string;
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
