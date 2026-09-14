import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Crown, Ticket, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/useAuth";
import { useAuthStore, type UserRole } from "../store/authStore";

export default function Login() {
  const { user, loading } = useAuth();
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<UserRole>("host");
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
  if (user) {
    return (
      <Navigate
        to={user.role === "attendee" ? "/my-invitations" : "/dashboard"}
        replace
      />
    );
  }

  const homeFor = (r: UserRole) => (r === "attendee" ? "/my-invitations" : "/dashboard");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    if (isSignUp && !displayName.trim()) {
      setError("Tell us your name so the door can greet you.");
      return;
    }
    setBusy(true);
    try {
      if (isSignUp) {
        const created = signUp(email, role, {
          display_name: displayName.trim() || email.trim().split("@")[0],
          username: username.trim() || email.trim().split("@")[0],
        });
        setInfo(
          created.role === "attendee"
            ? "Pass created. Opening your invitations…"
            : "Account created. Opening your desk…",
        );
        setTimeout(() => navigate(homeFor(created.role)), 900);
      } else {
        const signed = signIn(email, role);
        setTimeout(() => navigate(homeFor(signed.role)), 100);
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
          <p className="mt-3 text-sm text-cream/60 max-w-md">
            One portal, two doors — hosts compose evenings, guests carry their seals.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 sm:px-12 py-16">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <img
            src="/images/mark.png"
            alt=""
            className="w-8 h-8 object-contain"
          />
          <span className="font-display text-2xl tracking-[0.2em]">LUMEN</span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-cream mb-6 w-fit"
        >
          <ArrowLeft size={13} /> Back to the house
        </Link>
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-3">
          Unified entrance
        </p>
        <h1 className="font-display text-4xl mb-2">
          {isSignUp ? "Join the evening" : "Welcome back"}
        </h1>
        <p className="text-muted text-sm mb-6">
          {isSignUp
            ? "Choose your side of the door — host evenings or attend them."
            : "Sign in as a host or an attendee. Your side of the door is remembered."}
        </p>

        <div className="grid grid-cols-2 gap-2 max-w-md mb-6" role="tablist" aria-label="Choose your role">
          {(
            [
              { id: "host", icon: Crown, title: "Host", body: "Compose & verify" },
              { id: "attendee", icon: Ticket, title: "Attendee", body: "RSVP & tickets" },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={role === r.id}
              onClick={() => {
                setRole(r.id);
                setError("");
              }}
              className={`rounded-2xl border p-3.5 text-left transition-all ${
                role === r.id
                  ? "border-gold/60 bg-gold/10"
                  : "border-line bg-card hover:border-gold/25"
              }`}
            >
              <r.icon size={17} className={role === r.id ? "text-gold-2" : "text-muted"} />
              <p className={`mt-2 text-sm ${role === r.id ? "text-cream" : "text-cream/70"}`}>
                {r.title}
              </p>
              <p className="text-[11px] text-muted">{r.body}</p>
            </button>
          ))}
        </div>

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
                  placeholder={role === "host" ? "Clara Voss" : "Jordan Ellis"}
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
                  placeholder={role === "host" ? "claravoss" : "jordanellis"}
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
              placeholder={role === "host" ? "you@atelier.com" : "you@example.com"}
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
            {busy
              ? "Please wait…"
              : isSignUp
                ? role === "host"
                  ? "Create host account"
                  : "Create guest pass"
                : role === "host"
                  ? "Enter as host"
                  : "Enter as attendee"}
          </button>
        </form>

        <div className="max-w-md my-6 flex items-center gap-4 text-muted text-xs uppercase tracking-[0.2em]">
          <span className="flex-1 h-px bg-line" />
          Demo
          <span className="flex-1 h-px bg-line" />
        </div>

        <p className="max-w-md text-sm text-muted mb-6 bg-surface/50 border border-line/50 rounded-lg p-4">
          <strong>Demo Mode:</strong> any email + password (min 6 chars) works.
          {role === "attendee" ? (
            <>
              {" "}To see invitations, sign in with an invited address such as{" "}
              <span className="text-cream/80">sarah@example.com</span>.
            </>
          ) : (
            <>
              {" "}Try the host desk with{" "}
              <span className="text-cream/80">demo@lumen.events</span> /{" "}
              <span className="text-cream/80">password123</span>.
            </>
          )}
        </p>

        <p className="mt-2 text-sm text-muted max-w-md">
          {isSignUp ? "Already have a pass?" : "New to Lumen?"}
          <button
            onClick={() => setIsSignUp((v) => !v)}
            className="ml-2 text-gold-2 hover:underline"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}
