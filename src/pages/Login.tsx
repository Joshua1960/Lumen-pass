import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ShieldCheck, DoorOpen } from "lucide-react";
import type { Role } from "../lib/types";
import myLogo from "../assets/gci-logo.png";

export default function Login() {
  const { signIn, signUp, user, profile, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const initialRole = (params.get("as") as Role) || "host";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      const from = (loc.state as any)?.from as string | undefined;
      if (from && from !== "/login") {
        nav(from, { replace: true });
        return;
      }
      nav(profile.role === "host" ? "/dashboard" : "/my-tickets", {
        replace: true,
      });
    }
  }, [loading, user, profile, nav, loc.state]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
      } else {
        if (!displayName.trim()) throw new Error("Your name, please");
        if (password.length < 6)
          throw new Error("Password should be at least 6 characters");
        await signUp(email.trim(), password, displayName.trim(), role);
      }
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grain flex flex-col">
      <header className="max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img className="h-10 w-10" src={myLogo} alt="" />
          <span className="font-display text-xl text-cream">Lumen</span>
        </Link>
        <div className="text-xs uppercase tracking-[0.2em] text-[#8a8178]">
          The Door
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="hairline w-16 mx-auto mb-6" />
            <h1 className="font-display text-4xl text-cream mb-2">
              {mode === "signin" ? "Welcome back" : "A quiet welcome"}
            </h1>
          </div>

          <div className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-8 card-glow">
            <div className="corner-tl" />
            <div className="corner-tr" />
            <div className="corner-bl" />
            <div className="corner-br" />

            {mode === "signup" && (
              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-3">
                  Your role
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("host")}
                    className={`p-3 rounded border text-left transition-all ${role === "host" ? "border-[#c9a962] bg-[#c9a962]/5" : "border-[#332e28] hover:border-[#c9a962]/40"}`}
                  >
                    <div className="text-sm text-cream">Host</div>
                    <div className="text-[11px] text-[#8a8178] mt-0.5">
                      Compose events
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("attendee")}
                    className={`p-3 rounded border text-left transition-all ${role === "attendee" ? "border-[#c9a962] bg-[#c9a962]/5" : "border-[#332e28] hover:border-[#c9a962]/40"}`}
                  >
                    <div className="text-sm text-cream">Guest</div>
                    <div className="text-[11px] text-[#8a8178] mt-0.5">
                      Attend Event
                    </div>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
                    Full name
                  </label>
                  <input
                    className="field"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Igbinoba Emmanuel"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  className="field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                />
              </div>

              {err && (
                <div className="text-sm text-[#c47865] bg-[#c47865]/10 border border-[#c47865]/30 rounded px-3 py-2">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="btn-gold w-full py-3 rounded text-sm inline-flex items-center justify-center gap-2"
              >
                {busy ? (
                  <div
                    className="gold-ring"
                    style={{ width: 18, height: 18 }}
                  />
                ) : (
                  <>{mode === "signin" ? "Enter" : "Create Account"} </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-xs text-[#8a8178] hover:text-[#c9a962] tracking-wide"
              >
                {mode === "signin"
                  ? "New here? Create an account"
                  : "Have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
