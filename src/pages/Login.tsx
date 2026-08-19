import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="gold-ring" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (isSignUp) {
        // For development, just store in localStorage
        const localUser = {
          id: "user_" + Date.now(),
          email: email.trim(),
          user_metadata: {
            display_name: displayName.trim() || email.trim().split("@")[0],
            username: username.trim() || email.trim().split("@")[0],
          },
        };
        localStorage.setItem("auth_user", JSON.stringify(localUser));
        setInfo("Account created. Redirecting...");
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        // For development, just store in localStorage with any password
        const localUser = {
          id: "user_" + email.replace(/[^a-z0-9]/gi, "_"),
          email: email.trim(),
          user_metadata: {
            display_name: email.trim().split("@")[0],
            username: email.trim().split("@")[0],
          },
        };
        localStorage.setItem("auth_user", JSON.stringify(localUser));
        // Reload to update auth context
        setTimeout(() => (window.location.href = "/dashboard"), 100);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink grid lg:grid-cols-2">
      <div className="relative hidden lg:block grain">
        <img
          src="/covers/gala.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/20 via-ink/40 to-ink" />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="font-display text-5xl text-cream leading-tight">
            The evening begins at the door.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 sm:px-12 py-16">
        <Link to="/" className="flex items-center gap-2 mb-12">
          <img
            src="/images/mark.png"
            alt=""
            className="w-8 h-8 object-contain"
          />
          <span className="font-display text-2xl tracking-[0.2em]">LUMEN</span>
        </Link>
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-3">
          Host entrance
        </p>
        <h1 className="font-display text-4xl mb-2">
          {isSignUp ? "Open an account" : "Welcome back"}
        </h1>
        <p className="text-muted text-sm mb-8">
          {isSignUp
            ? "Create a host account to compose evenings."
            : "Sign in to manage invitations and the door."}
        </p>

        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
          {isSignUp && (
            <>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-muted mb-1.5">
                  Display name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-cream outline-none focus:border-gold/50"
                  placeholder="Clara Voss"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-muted mb-1.5">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-cream outline-none focus:border-gold/50"
                  placeholder="claravoss"
                  autoComplete="username"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-muted mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-cream outline-none focus:border-gold/50"
              placeholder="you@atelier.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-muted mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-cream outline-none focus:border-gold/50"
              placeholder="••••••••"
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>
          {error && <p className="text-sm text-rose">{error}</p>}
          {info && <p className="text-sm text-sage">{info}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-full bg-gold text-ink text-sm tracking-wide hover:bg-gold-2 disabled:opacity-60 transition-colors"
          >
            {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="max-w-md my-6 flex items-center gap-4 text-muted text-xs uppercase tracking-[0.2em]">
          <span className="flex-1 h-px bg-line" />
          Demo
          <span className="flex-1 h-px bg-line" />
        </div>

        <p className="max-w-md text-sm text-muted mb-6 bg-surface/50 border border-line/50 rounded-lg p-4">
          <strong>Demo Mode:</strong> Use any email and password (min 6 chars)
          to sign in or create an account.
        </p>

        <p className="mt-6 text-sm text-muted max-w-md">
          {isSignUp ? "Already hosting?" : "New to Lumen?"}
          <button
            onClick={() => setIsSignUp((v) => !v)}
            className="ml-2 text-gold-2 hover:underline"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </button>
        </p>
        <p className="mt-8 text-xs text-muted/80 max-w-md">
          Demo host — <span className="text-cream/70">demo@lumen.events</span> /{" "}
          <span className="text-cream/70">password123</span>
        </p>
      </div>
    </div>
  );
}
