import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    email: string;
    required: boolean;
  } | null>(null);

  useEffect(() => {
    if (!loading && !creatingAccount && !confirmation && user && profile) {
      const from = (loc.state as any)?.from as string | undefined;
      if (from && from !== "/login") {
        nav(from, { replace: true });
        return;
      }
      nav(profile.role === "host" ? "/dashboard" : "/my-tickets", {
        replace: true,
      });
    }
  }, [loading, creatingAccount, confirmation, user, profile, nav, loc.state]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    if (mode === "signup") setCreatingAccount(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
      } else {
        if (!displayName.trim()) throw new Error("Your name, please");
        if (password.length < 6)
          throw new Error("Password should be at least 6 characters");
        const result = await signUp(
          email.trim(),
          password,
          displayName.trim(),
          role,
        );
        setConfirmation({
          email: email.trim(),
          required: result.emailConfirmationRequired,
        });
      }
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setCreatingAccount(false);
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
          LUMEN BY GCI
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
                  <>{mode === "signin" ? "Log in" : "Create Account"} </>
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
      {confirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5 py-8"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
            className="relative w-full max-w-md rounded-xl border border-[#332e28] bg-[#211d19] p-8 text-center card-glow"
          >
            <div className="corner-tl" />
            <div className="corner-tr" />
            <div className="corner-bl" />
            <div className="corner-br" />
            <h2
              id="confirmation-title"
              className="mb-3 font-display text-3xl text-cream"
            >
              {confirmation.required
                ? "Check your email"
                : "Your account is ready"}
            </h2>
            <p className="mb-2 text-sm leading-relaxed text-[#8a8178]">
              {confirmation.required
                ? "We sent a confirmation link to"
                : "Email confirmation is not required for this account."}
            </p>
            {confirmation.required && (
              <>
                <p className="mb-2 break-all text-sm text-[#e8d5a3]">
                  {confirmation.email}
                </p>
                <p className="mb-6 text-sm leading-relaxed text-[#8a8178]">
                  Confirm your email, then return here to sign in.
                </p>
              </>
            )}
            {!confirmation.required && <div className="mb-6" />}
            <button
              type="button"
              onClick={() => {
                setConfirmation(null);
                setMode("signin");
                setPassword("");
              }}
              className="btn-gold w-full rounded py-3 text-sm"
            >
              {confirmation.required ? "Back to sign in" : "Continue"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
