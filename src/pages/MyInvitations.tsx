import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ticket,
  CalendarDays,
  History,
  LayoutGrid,
  MapPin,
  Check,
  X,
  QrCode,
  ArrowRight,
} from "lucide-react";
import Navbar from "../components/Navbar";
import TicketCard from "../components/TicketCard";
import { InviteBadge } from "../components/StatusBadge";
import { apiFetch } from "../lib/api";
import type { EventRecord, Invitation } from "../lib/types";
import {
  formatDate,
  formatShortDate,
  formatTime,
  isUpcoming,
} from "../lib/format";
import { useAuthStore } from "../store/authStore";

type Tab = "upcoming" | "past" | "tickets";

export default function MyInvitations() {
  const user = useAuthStore((s) => s.user);
  const email = (user?.email || "").toLowerCase();
  const display =
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Guest";

  const [invites, setInvites] = useState<Invitation[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [busyToken, setBusyToken] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Invitation | null>(null);

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
      setError(
        err instanceof Error ? err.message : "Unable to load invitations",
      );
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

  const upcoming = useMemo(
    () =>
      invites.filter((i) => {
        const ev = byId.get(i.event_id);
        if (!ev) return false;
        return isUpcoming(ev.starts_at) && ev.status !== "cancelled";
      }),
    [invites, byId],
  );
  const past = useMemo(
    () =>
      invites.filter((i) => {
        const ev = byId.get(i.event_id);
        if (!ev) return true;
        return !isUpcoming(ev.starts_at) || ev.status === "cancelled";
      }),
    [invites, byId],
  );
  const tickets = useMemo(
    () =>
      invites.filter((i) => {
        const ev = byId.get(i.event_id);
        if (!ev || ev.status === "cancelled") return false;
        return i.status !== "declined";
      }),
    [invites, byId],
  );

  const rsvp = async (inv: Invitation, status: "accepted" | "declined") => {
    setBusyToken(inv.qr_token);
    setError("");
    try {
      await apiFetch("/api/invite", {
        method: "PUT",
        body: JSON.stringify({ token: inv.qr_token, status }),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to update RSVP");
    } finally {
      setBusyToken(null);
    }
  };

  const tabs: Array<{
    id: Tab;
    label: string;
    icon: typeof Ticket;
    count: number;
  }> = [
    {
      id: "upcoming",
      label: "Upcoming",
      icon: CalendarDays,
      count: upcoming.length,
    },
    { id: "past", label: "Past", icon: History, count: past.length },
    {
      id: "tickets",
      label: "Tickets",
      icon: LayoutGrid,
      count: tickets.length,
    },
  ];

  const list = tab === "upcoming" ? upcoming : tab === "past" ? past : tickets;

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="max-w-6xl mx-auto px-5 py-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">
          Guest pass
        </p>
        <h1 className="font-display text-4xl sm:text-5xl">
          Evenings for {display}
        </h1>
        <p className="text-muted text-sm mt-2 mb-8">
          Your personal timeline — reply, then carry the seal to the door.
        </p>

        <div
          className="flex flex-wrap gap-2 mb-8"
          role="tablist"
          aria-label="Invitation timeline"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs uppercase tracking-[0.14em] border transition-colors ${
                tab === t.id
                  ? "border-gold/50 text-gold-2 bg-gold/10"
                  : "border-line text-muted hover:text-cream"
              }`}
            >
              <t.icon size={13} />
              {t.label}
              <span className="text-[11px] opacity-70">{t.count}</span>
            </button>
          ))}
          <Link
            to="/my-tickets"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gold text-ink text-xs uppercase tracking-[0.14em] hover:bg-gold-2 ml-auto"
          >
            <QrCode size={13} /> Quick tickets <ArrowRight size={13} />
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="gold-ring" />
          </div>
        )}
        {error && <p className="text-rose text-sm mb-6">{error}</p>}

        {!loading && !list.length && (
          <div className="rounded-2xl border border-dashed border-line py-16 text-center px-6">
            <Ticket size={28} className="mx-auto text-gold mb-4" />
            <p className="font-display text-2xl mb-2">
              {tab === "past"
                ? "No past evenings yet"
                : tab === "tickets"
                  ? "No tickets yet"
                  : "No upcoming invitations"}
            </p>
            <p className="text-muted text-sm mb-2 max-w-md mx-auto">
              Invitations sent to <span className="text-cream/80">{email}</span>{" "}
              will appear here. Accept one and its ticket is issued instantly.
            </p>
            <p className="text-xs text-muted/80">
              Demo tip — sign in as{" "}
              <span className="text-gold-2">sarah@example.com</span> to see a
              live invitation.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((inv) => {
            const ev = byId.get(inv.event_id);
            if (!ev) return null;
            return (
              <article
                key={inv.id}
                className="rounded-2xl overflow-hidden bg-card border border-line card-glow flex flex-col"
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={ev.cover_image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-card via-card/20 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <InviteBadge status={inv.status} />
                  </div>
                  {inv.status === "checked_in" && (
                    <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wide border border-sage/50 bg-ink/60 text-sage">
                      Admitted
                    </span>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gold mb-1">
                    {formatShortDate(ev.starts_at)} · {formatTime(ev.starts_at)}
                  </p>
                  <h3 className="font-display text-2xl leading-tight mb-1">
                    {ev.title}
                  </h3>
                  <p className="flex items-center gap-1.5 text-sm text-muted mb-4">
                    <MapPin size={13} className="text-gold/70" /> {ev.venue}
                  </p>
                  {tab !== "tickets" && (
                    <div className="flex gap-2 mt-auto">
                      {inv.status !== "checked_in" &&
                        ev.status !== "cancelled" && (
                          <>
                            <button
                              disabled={busyToken === inv.qr_token}
                              onClick={() => rsvp(inv, "accepted")}
                              className={`flex-1 py-2 rounded-full text-xs inline-flex items-center justify-center gap-1 transition-colors ${
                                inv.status === "accepted"
                                  ? "bg-sage text-ink"
                                  : "bg-gold text-ink hover:bg-gold-2"
                              }`}
                            >
                              <Check size={13} />
                              {busyToken === inv.qr_token
                                ? "Saving…"
                                : inv.status === "accepted"
                                  ? "Accepted"
                                  : "Accept"}
                            </button>
                            <button
                              disabled={busyToken === inv.qr_token}
                              onClick={() => rsvp(inv, "declined")}
                              className="flex-1 py-2 rounded-full text-xs border border-line text-muted hover:text-cream inline-flex items-center justify-center gap-1"
                            >
                              <X size={13} /> Decline
                            </button>
                          </>
                        )}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Link
                      to={`/invite/${inv.qr_token}`}
                      className="flex-1 text-center py-2 rounded-full border border-line text-xs text-cream hover:border-gold/40"
                    >
                      Open invitation
                    </Link>
                    {inv.status !== "declined" && ev.status !== "cancelled" && (
                      <button
                        onClick={() => setTicket(inv)}
                        className="flex-1 py-2 rounded-full bg-cream text-ink text-xs inline-flex items-center justify-center gap-1 hover:bg-white"
                      >
                        <QrCode size={13} /> Ticket
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="text-xs text-muted mt-10 text-center">
          Showing {list.length} of {invites.length} invitations ·{" "}
          {formatDate(new Date().toISOString())} is today
        </p>
      </main>

      {ticket && (
        <div
          className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setTicket(null)}
        >
          <div
            className="w-full max-w-sm my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const ev = byId.get(ticket.event_id);
              if (!ev) return null;
              return <TicketCard invitation={ticket} event={ev} />;
            })()}
            <button
              onClick={() => setTicket(null)}
              className="w-full mt-3 py-2.5 rounded-full border border-line text-sm text-cream hover:border-gold/40"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
