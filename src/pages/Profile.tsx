import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

export default function Profile() {
  const { profile, refreshProfile, user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
    setUsername(profile?.username || "");
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await api.updateProfile({
        display_name: displayName.trim(),
        username: username.trim(),
      });
      await refreshProfile();
      setMsg("Saved.");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-2">
            You
          </div>
          <h1 className="font-display text-5xl text-cream">Profile</h1>
        </div>

        <form
          onSubmit={save}
          className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-8 card-glow space-y-5"
        >
          <div className="corner-tl" />
          <div className="corner-tr" />
          <div className="corner-bl" />
          <div className="corner-br" />

          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2 flex items-center gap-1.5">
              {" "}
              Display name
            </label>
            <input
              className="field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2 flex items-center gap-1.5">
              Username
            </label>
            <input
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2 flex items-center gap-1.5">
              Email
            </label>
            <div className="field text-[#8a8178]">{user?.email}</div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2 flex items-center gap-1.5">
              Role
            </label>
            <div className="field text-cream">
              {profile?.role === "host"
                ? "Host · Compose events"
                : "Guest · Attend evenings"}
            </div>
          </div>

          {msg && (
            <div className="text-sm text-[#7d9b7f] bg-[#7d9b7f]/10 border border-[#7d9b7f]/30 rounded px-3 py-2">
              {msg}
            </div>
          )}
          {err && (
            <div className="text-sm text-[#c47865] bg-[#c47865]/10 border border-[#c47865]/30 rounded px-3 py-2">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-gold px-6 py-3 rounded text-sm inline-flex items-center gap-2"
          >
            {busy ? (
              <div className="gold-ring" style={{ width: 16, height: 16 }} />
            ) : (
              <>Save</>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
