import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

interface AuthValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  loading: true,
});
