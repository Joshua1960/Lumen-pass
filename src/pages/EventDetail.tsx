import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  MapPin,
  Clock,
  Shirt,
  Users,
  ScanLine,
  ClipboardList,
  Plus,
  Trash2,
  Copy,
  Check,
  Pencil,
  Download,
  Send,
  UserCheck,
  Undo2,
} from "lucide-react";
import Navbar from "../components/Navbar";
import CapacityMeter from "../components/CapacityMeter";
import { EventBadge, InviteBadge } from "../components/StatusBadge";
import QRDisplay from "../components/QRDisplay";
import VenueMap from "../components/VenueMap";
import InviteEngine from "../components/InviteEngine";
import type {
  AttendanceLog,
  EventRecord,
  Invitation,
  InviteStatus,
} from "../lib/types";
import { apiFetch } from "../lib/api";
import { useLiveStream } from "../lib/useLiveStream";
import {
  formatDate,
  formatTime,
  inviteLink,
  exportInvitationsCsv,
  exportEventAnalyticsCsv,
} from "../lib/format";

const FILTERS: Array<InviteStatus | "all"> = [
  "all",
  "pending",
  "sent",
  "accepted",
  "declined",
  "checked_in",
];

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<InviteStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [preview, setPreview] = useState<Invitation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [overrideId, setOverrideId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError("");
      const [ev, list] = await Promise.all([
        apiFetch<EventRecord>(`/api/events?id=${id}`),
        apiFetch<Invitation[]>(`/api/invitations?event_id=${id}`),
      ]);
      setEvent(ev);
      setInvites(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load event");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Real-time stream: door check-ins refresh counts + the list instantly.
  useLiveStream(load);
  useEffect(() => {
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const visible = useMemo(() => {
    return invites.filter((g) => {
      const okStatus = filter === "all" || g.status === filter;
      const q = query.trim().toLowerCase();
      const okQ =
        !q ||
        g.guest_name.toLowerCase().includes(q) ||
        (g.guest_email || "").toLowerCase().includes(q);
      return okStatus && okQ;
    });
  }, [invites, filter, query]);

  const updateStatus = async (inv: Invitation, status: InviteStatus) => {
    try {
      await apiFetch("/api/invitations", {
        method: "PUT",
        body: JSON.stringify({ id: inv.id, status }),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const override = async (inv: Invitation, action: "check_in" | "undo") => {
    setOverrideId(inv.id);
    setError("");
    try {
      await apiFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify({ invitation_id: inv.id, action }),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Override failed");
    } finally {
      setOverrideId(null);
    }
  };

  const exportAnalytics = async () => {
    if (!event) return;
    try {
      const data = await apiFetch<{ logs: AttendanceLog[] }>(
        `/api/attendance?event_id=${event.id}`,
      );
      exportEventAnalyticsCsv(event, invites, data.logs || []);
    } catch {
      exportInvitationsCsv(invites, event.title);
    }
  };

  const removeGuest = async (inv: Invitation) => {
    if (!confirm(`Remove ${inv.guest_name} from the list?`)) return;
    try {
      await apiFetch("/api/invitations", {
        method: "DELETE",
        body: JSON.stringify({ id: inv.id }),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const resendPending = async () => {
    const ids = invites.filter((g) => g.status === "pending").map((g) => g.id);
    if (!ids.length) {
      setError("No pending invitations to send.");
      return;
    }
    setDispatching(true);
    setError("");
    try {
      await apiFetch("/api/dispatch", {
        method: "POST",
        body: JSON.stringify({
          event_id: Number(id),
          invitation_ids: ids,
          origin: window.location.origin,
        }),
      });
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to send invitations",
      );
    } finally {
      setDispatching(false);
    }
  };

  const copyLink = async (inv: Invitation) => {
    try {
      await navigator.clipboard.writeText(inviteLink(inv.qr_token));
      setCopied(inv.id);
      if (inv.status === "pending") await updateStatus(inv, "sent");
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("Unable to copy link");
    }
  };

  const cancelEvent = async () => {
    if (!event) return;
    try {
      await apiFetch("/api/events", {
        method: "PUT",
        body: JSON.stringify({
          id: event.id,
          status: event.status === "cancelled" ? "published" : "cancelled",
        }),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to update event");
    }
  };

  const deleteEvent = async () => {
    if (!event) return;
    try {
      await apiFetch("/api/events", {
        method: "DELETE",
        body: JSON.stringify({ id: event.id }),
      });
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to delete event");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ink">
        <Navbar />
        <div className="flex justify-center py-24">
          <div className="gold-ring" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-ink">
        <Navbar />
        <p className="text-center text-rose py-20">
          {error || "Event not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img
          src={event.cover_image}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
        <div className="absolute bottom-0 left-0 right-0 max-w-6xl mx-auto px-5 pb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <EventBadge status={event.status} />
          </div>
          <h1 className="font-display text-4xl sm:text-6xl leading-tight">
            {event.title}
          </h1>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {error && <p className="text-sm text-rose mb-4">{error}</p>}

        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 rounded-2xl border border-line bg-card p-6">
            <p className="text-cream/80 leading-relaxed mb-6">
              {event.description}
            </p>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <p className="flex items-start gap-2 text-muted">
                <MapPin size={16} className="text-gold mt-0.5" />
                <span>
                  <span className="text-cream block">{event.venue}</span>
                  {event.address}
                </span>
              </p>
              <p className="flex items-start gap-2 text-muted">
                <Clock size={16} className="text-gold mt-0.5" />
                <span>
                  <span className="text-cream block">
                    {formatDate(event.starts_at)}
                  </span>
                  {formatTime(event.starts_at)} – {formatTime(event.ends_at)}
                </span>
              </p>
              {event.dress_code && (
                <p className="flex items-center gap-2 text-muted">
                  <Shirt size={16} className="text-gold" />
                  <span className="text-cream">{event.dress_code}</span>
                </p>
              )}
              <p className="flex items-center gap-2 text-muted">
                <Users size={16} className="text-gold" />
                <span className="text-cream">
                  {invites.length} invited ·{" "}
                  {Math.max(0, event.capacity - invites.length)} seats open
                </span>
              </p>
            </div>
            <div className="mt-6">
              <VenueMap
                venue={event.venue}
                address={event.address}
                height={200}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-card p-6 flex flex-col gap-5">
            <CapacityMeter
              current={event.checked_in_count || 0}
              capacity={event.capacity}
            />
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-white/4 py-3">
                <p className="font-display text-2xl text-gold-2">
                  {event.accepted_count || 0}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted">
                  Accepted
                </p>
              </div>
              <div className="rounded-xl bg-white/4 py-3">
                <p className="font-display text-2xl text-rose">
                  {event.declined_count || 0}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted">
                  Declined
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                to={`/events/${event.id}/scan`}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-gold text-ink text-sm hover:bg-gold-2"
              >
                <ScanLine size={16} /> Open door scanner
              </Link>
              <Link
                to={`/events/${event.id}/attendance`}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-full border border-line text-sm text-cream hover:border-gold/40"
              >
                <ClipboardList size={16} /> Attendance log
              </Link>
              <Link
                to={`/events/${event.id}/edit`}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-full border border-line text-sm text-muted hover:text-cream"
              >
                <Pencil size={14} /> Edit evening
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-3xl">The list</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportInvitationsCsv(invites, event.title)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-xs text-muted hover:text-cream"
            >
              <Download size={13} /> Guest CSV
            </button>
            <button
              onClick={exportAnalytics}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-xs text-muted hover:text-cream"
            >
              <Download size={13} /> Analytics CSV
            </button>
            <button
              onClick={resendPending}
              disabled={dispatching}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-xs text-muted hover:text-cream disabled:opacity-50"
            >
              <Send size={13} /> {dispatching ? "Sending…" : "Send pending"}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold text-ink text-xs"
            >
              <Plus size={13} /> Invite guests
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guests…"
            className="flex-1 bg-card border border-line rounded-xl px-4 py-2 text-sm outline-none focus:border-gold/50"
          />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider border ${
                  filter === f
                    ? "border-gold/50 text-gold-2 bg-gold/10"
                    : "border-line text-muted"
                }`}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase tracking-widest text-muted bg-card border-b border-line">
            <div className="col-span-3">Guest</div>
            <div className="col-span-3">Contact</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1">+1</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          {visible.length === 0 && (
            <p className="text-center text-muted text-sm py-12">
              No guests match this view.
            </p>
          )}
          {visible.map((g) => (
            <div
              key={g.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 border-t border-line/70 items-center"
            >
              <div className="md:col-span-3">
                <p className="text-cream">{g.guest_name}</p>
                {g.note && (
                  <p className="text-xs text-muted truncate">{g.note}</p>
                )}
              </div>
              <div className="md:col-span-3 text-sm text-muted">
                <p>{g.guest_email || "—"}</p>
                <p className="text-xs">{g.guest_phone}</p>
              </div>
              <div className="md:col-span-2">
                <InviteBadge status={g.status} />
              </div>
              <div className="md:col-span-1 text-sm text-muted">
                {g.plus_ones}
              </div>
              <div className="md:col-span-3 flex md:justify-end flex-wrap gap-1.5">
                <button
                  onClick={() => setPreview(g)}
                  className="px-2 py-1 rounded-lg border border-line text-[11px] text-muted hover:text-cream"
                >
                  QR
                </button>
                <button
                  onClick={() => copyLink(g)}
                  className="px-2 py-1 rounded-lg border border-line text-[11px] text-muted hover:text-cream inline-flex items-center gap-1"
                >
                  {copied === g.id ? <Check size={11} /> : <Copy size={11} />}
                  Link
                </button>
                {g.status !== "checked_in" && g.status !== "sent" && (
                  <button
                    onClick={() => updateStatus(g, "sent")}
                    className="px-2 py-1 rounded-lg border border-line text-[11px] text-muted hover:text-cream inline-flex items-center gap-1"
                  >
                    <Send size={11} /> Sent
                  </button>
                )}
                {g.status === "checked_in" ? (
                  <button
                    disabled={overrideId === g.id}
                    onClick={() => override(g, "undo")}
                    className="px-2 py-1 rounded-lg border border-line text-[11px] text-muted hover:text-cream inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Undo2 size={11} /> Undo
                  </button>
                ) : g.status !== "declined" ? (
                  <button
                    disabled={overrideId === g.id}
                    onClick={() => override(g, "check_in")}
                    className="px-2 py-1 rounded-lg border border-gold/30 bg-gold/10 text-[11px] text-gold-2 hover:bg-gold/20 inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <UserCheck size={11} /> Admit
                  </button>
                ) : null}
                <button
                  onClick={() => removeGuest(g)}
                  className="px-2 py-1 rounded-lg border border-line text-[11px] text-rose/80 hover:text-rose"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm">
          <button onClick={cancelEvent} className="text-amber hover:underline">
            {event.status === "cancelled"
              ? "Restore evening"
              : "Cancel evening"}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-rose hover:underline"
          >
            Delete evening
          </button>
        </div>
      </main>

      {showAdd && (
        <InviteEngine
          event={event}
          invites={invites}
          onClose={() => setShowAdd(false)}
          onChanged={load}
        />
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-cream text-ink rounded-2xl p-6 max-w-xs w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-ink/50 mb-1">
              Door seal
            </p>
            <p className="font-display text-2xl mb-4">{preview.guest_name}</p>
            <div className="flex justify-center mb-4">
              <QRDisplay value={inviteLink(preview.qr_token)} size={200} />
            </div>
            <p className="text-xs text-ink/50 break-all">{preview.qr_token}</p>
            <button
              onClick={() => setPreview(null)}
              className="mt-4 text-sm underline"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-display text-2xl mb-2">Delete this evening?</h3>
            <p className="text-sm text-muted mb-6">
              Guests, QR seals, and the attendance book will be erased.
            </p>
            <div className="flex gap-2">
              <button
                onClick={deleteEvent}
                className="flex-1 py-2 rounded-full bg-rose text-ink text-sm"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-full border border-line text-sm"
              >
                Keep
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
