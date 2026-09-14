import { useState, type FormEvent } from "react";
import { Check, Pencil, User } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuthStore } from "../store/authStore";

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || "");
  const [username, setUsername] = useState(user?.user_metadata?.username || "");
  const [phone, setPhone] = useState((user?.user_metadata?.phone as string) || "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!displayName.trim()) {
      setError("A display name is required.");
      return;
    }
    if (username.trim() && !/^[a-zA-Z0-9_.]{3,30}$/.test(username.trim())) {
      setError("Usernames are 3–30 characters: letters, numbers, dots, underscores.");
      return;
    }
    updateProfile({
      user_metadata: {
        display_name: displayName.trim(),
        username: username.trim() || user?.email?.split("@")[0] || "",
        phone: phone.trim(),
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const initials = (displayName || user?.email || "G")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="max-w-xl mx-auto px-5 py-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">
          Guest pass
        </p>
        <h1 className="font-display text-4xl mb-2">Your profile</h1>
        <p className="text-muted text-sm mb-8">
          This is the name the door reads aloud. Keep it as it appears on your seal.
        </p>

        <div className="rounded-2xl border border-line bg-card p-6 mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center shrink-0">
            {initials ? (
              <span className="font-display text-xl text-gold-2">{initials}</span>
            ) : (
              <User size={22} className="text-gold-2" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-cream truncate">
              {user?.user_metadata?.display_name || "Guest"}
            </p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
            <p className="text-[11px] text-sage mt-0.5 uppercase tracking-[0.16em]">
              Attendee pass
            </p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-line bg-card p-6 space-y-4"
        >
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-muted mb-1.5">
              Display name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-cream outline-none focus:border-gold/50"
              placeholder="Jordan Ellis"
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
              placeholder="jordanellis"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-muted mb-1.5">
              Phone (optional)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-cream outline-none focus:border-gold/50"
              placeholder="+1-555-0100"
              autoComplete="tel"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-muted mb-1.5">
              Email
            </label>
            <input
              value={user?.email || ""}
              disabled
              className="w-full bg-surface/50 border border-line rounded-xl px-4 py-3 text-muted outline-none cursor-not-allowed"
            />
            <p className="text-[11px] text-muted mt-1.5">
              Invitations follow this address — it cannot be changed here.
            </p>
          </div>

          {error && <p className="text-sm text-rose">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 rounded-full bg-gold text-ink text-sm tracking-wide hover:bg-gold-2 transition-colors inline-flex items-center justify-center gap-2"
          >
            {saved ? <Check size={15} /> : <Pencil size={15} />}
            {saved ? "Saved" : "Save profile"}
          </button>
        </form>
      </main>
    </div>
  );
}
