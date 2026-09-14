import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QrCode, MapPin, Search, Ticket, ArrowLeft } from "lucide-react";
import Navbar from "../components/Navbar";
import TicketCard from "../components/TicketCard";
import { InviteBadge } from "../components/StatusBadge";
import { apiFetch } from "../lib/api";
import type { EventRecord, Invitation } from "../lib/types";
import { formatShortDate, formatTime } from "../lib/format";
import { useAuthStore } from "../store/authStore";

export default function MyTickets() {
  const user = useAuthStore((s) => s.user);
  const email = (user?.email || "").toLowerCase();

  const [invites, setInvites] = useState<Invitation[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Invitation | null>(null);

  const load = useCallback(async () => {
    if (!email) return;
    try {
      setError("");
      const data = await apiFetch<{
        invitations: Invitation[];
        events: EventRecord[];
      }>(`/api/invitations?email=${encodeURIComponent(email)}`);
      setInvites(Array.isArray(data.invitations) ? data.invitations : []);
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load tickets");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const byId = useMemo(() => {
    const m = new Map<number, EventRecord>();
    events.forEach((e) => m.set(e.id, e));
    return m;
  }, [events]);

  const valid = useMemo(() => {
    const query = q.trim().toLowerCase();
    return invites
      .filter((i) => {
        const ev = byId.get(i.event_id);
        if (!ev || ev.status === "cancelled" || i.status === "declined")
          return false;
        if (!query) return true;
        return (
          ev.title.toLowerCase().includes(query) ||
          ev.venue.toLowerCase().includes(query) ||
          i.guest_name.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const ea = byId.get(a.event_id)?.starts_at || "";
        const eb = byId.get(b.event_id)?.starts_at || "";
        return ea.localeCompare(eb);
      });
  }, [invites, byId, q]);

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="max-w-4xl mx-auto px-5 py-10">
        <Link
          to="/my-invitations"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-cream mb-6"
        >
          <ArrowLeft size={14} /> Back to invitations
        </Link>
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">
          Quick access
        </p>
        <h1 className="font-display text-4xl sm:text-5xl mb-2">Your tickets</h1>
        <p className="text-muted text-sm mb-8">
          Every live seal in one place — tap to present the QR at the door.
        </p>

        <div className="relative mb-6">
          <Search size={14} className="absolute left-4 top-3.5 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by evening, venue, or name…"
            className="w-full bg-card border border-line rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-gold/50"
          />
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="gold-ring" />
          </div>
        )}
        {error && <p className="text-rose text-sm mb-6">{error}</p>}

        {!loading && !valid.length && (
          <div className="rounded-2xl border border-dashed border-line py-16 text-center px-6">
            <Ticket size={28} className="mx-auto text-gold mb-4" />
            <p className="font-display text-2xl mb-2">No tickets to show</p>
            <p className="text-muted text-sm">
              Accept an invitation and its ticket lands here instantly.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {valid.map((inv) => {
            const ev = byId.get(inv.event_id);
            if (!ev) return null;
            return (
              <button
                key={inv.id}
                onClick={() => setActive(inv)}
                className="w-full text-left rounded-2xl border border-line bg-card p-4 flex items-center gap-4 hover:border-gold/40 transition-colors"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  <img
                    src={ev.cover_image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-cream truncate">{ev.title}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted mt-0.5">
                    <MapPin size={11} className="text-gold/70" /> {ev.venue} ·{" "}
                    {formatShortDate(ev.starts_at)} · {formatTime(ev.starts_at)}
                  </p>
                  <div className="mt-1.5">
                    <InviteBadge status={inv.status} />
                  </div>
                </div>
                <span className="shrink-0 w-10 h-10 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
                  <QrCode size={17} className="text-gold-2" />
                </span>
              </button>
            );
          })}
        </div>
      </main>

      {active && (
        <div
          className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setActive(null)}
        >
          <div
            className="w-full max-w-sm my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const ev = byId.get(active.event_id);
              if (!ev) return null;
              return <TicketCard invitation={active} event={ev} />;
            })()}
            <div className="flex gap-2 mt-3">
              <Link
                to={`/invite/${active.qr_token}`}
                className="flex-1 py-2.5 rounded-full bg-gold text-ink text-sm text-center hover:bg-gold-2"
              >
                Details
              </Link>
              <button
                onClick={() => setActive(null)}
                className="flex-1 py-2.5 rounded-full border border-line text-sm text-cream hover:border-gold/40"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
