import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import CapacityMeter from "../components/CapacityMeter";
import StatusBadge from "../components/StatusBadge";
import { api } from "../lib/api";
import { formatDate, formatTime, countdown } from "../lib/format";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ScanLine,
  ClipboardList,
  Send,
  Copy,
  Pencil,
  Shirt,
  X,
  Check,
  Mail,
} from "lucide-react";
import type { Invitation, Event } from "../lib/types";

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [showInvite, setShowInvite] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [plusOnes, setPlusOnes] = useState(0);
  const [bulk, setBulk] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ev, invs] = await Promise.all([
        api.getEvent(id),
        api.listInvitations(id),
      ]);
      setEvent(ev);
      setInvitations(invs);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const total = invitations.length;
    const accepted = invitations.filter((i) => i.status === "accepted").length;
    const acceptedSeats = invitations
      .filter((i) => i.status === "accepted")
      .reduce((sum, invitation) => sum + 1 + (invitation.plus_ones || 0), 0);
    const declined = invitations.filter((i) => i.status === "declined").length;
    const pending = invitations.filter((i) => i.status === "pending").length;
    const requested = invitations.filter(
      (i) => i.status === "requested",
    ).length;
    return { total, accepted, acceptedSeats, declined, pending, requested };
  }, [invitations]);

  const addOne = async () => {
    if (!id) return;
    if (!guestName.trim() || !guestEmail.trim()) return;
    setCreating(true);
    try {
      await api.createInvitation({
        event_id: id,
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim().toLowerCase(),
        plus_ones: plusOnes,
      });
      setGuestName("");
      setGuestEmail("");
      setPlusOnes(0);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setCreating(false);
    }
  };

  const addBulk = async () => {
    if (!id) return;
    const lines = bulk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    setCreating(true);
    try {
      for (const line of lines) {
        // Format: "Name, email" or "Name <email>"
        let name = "",
          email = "";
        if (line.includes(",")) {
          [name, email] = line.split(",").map((s) => s.trim());
        } else if (line.includes("<") && line.includes(">")) {
          const m = line.match(/(.+)<(.+)>/);
          if (m) {
            name = m[1].trim();
            email = m[2].trim();
          }
        } else if (line.includes(" ")) {
          const parts = line.split(/\s+/);
          email = parts.pop() || "";
          name = parts.join(" ");
        } else {
          continue;
        }
        if (!name || !email) continue;
        await api.createInvitation({
          event_id: id,
          guest_name: name,
          guest_email: email.toLowerCase(),
          plus_ones: 0,
        });
      }
      setBulk("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (inv: Invitation) => {
    const url = `${window.location.origin}/invite/${inv.token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
    setCopiedId(String(inv.id));
    setTimeout(() => setCopiedId(null), 1500);
  };

  const emailInvite = (inv: Invitation) => {
    if (!event) return;
    const url = `${window.location.origin}/invite/${inv.token}`;
    const subject = `You're invited — ${event.title}`;
    const body = [
      `${inv.guest_name},`,
      "",
      `You're invited to ${event.title}.`,
      "",
      `When: ${formatDate(event.starts_at)} at ${formatTime(event.starts_at)}`,
      `Where: ${event.venue}${event.address ? " · " + event.address : ""}`,
      event.dress_code ? `Dress: ${event.dress_code}` : "",
      inv.plus_ones > 0 ? `Plus ${inv.plus_ones}` : "",
      "",
      "Reply to this invitation and receive your Lumen pass:",
      url,
      "",
      "Warmly,",
    ]
      .filter(Boolean)
      .join("\n");
    window.location.href = `mailto:${encodeURIComponent(inv.guest_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const removeInvite = async (inv: Invitation) => {
    if (!confirm(`Rescind invitation to ${inv.guest_name}?`)) return;
    try {
      await api.deleteInvitation(inv.id);
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const reviewRequest = async (
    inv: Invitation,
    status: "accepted" | "declined",
  ) => {
    setReviewingId(String(inv.id));
    setErr("");
    try {
      await api.reviewPublicInterest(inv.id, status);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setReviewingId(null);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#0c0b0a] grain">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="gold-ring" />
        </div>
      </div>
    );
  if (!event)
    return (
      <div className="min-h-screen bg-[#0c0b0a] grain">
        <Navbar />
        <div className="text-center py-24 text-[#8a8178]">Event not found</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#8a8178] hover:text-[#c9a962] mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> All events
        </Link>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#211d19] to-[#141210] border border-[#332e28] rounded-xl p-8 md:p-10 mb-8 overflow-hidden">
          <div className="corner-tl" />
          <div className="corner-tr" />
          <div className="corner-bl" />
          <div className="corner-br" />
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex-1 min-w-[280px]">
              <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-3">
                {countdown(event.starts_at)}
              </div>
              <h1 className="font-display text-5xl text-cream mb-4 leading-tight">
                {event.title}
              </h1>
              {event.description && (
                <p className="text-[#8a8178] max-w-xl mb-5 leading-relaxed">
                  {event.description}
                </p>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#8a8178]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />{" "}
                  {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> {event.venue}
                  {event.address ? ` · ${event.address}` : ""}
                </div>
                {event.dress_code && (
                  <div className="flex items-center gap-2">
                    <Shirt className="w-3.5 h-3.5" /> {event.dress_code}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                to={`/events/${event.id}/scan`}
                className="btn-gold px-5 py-2.5 rounded text-sm inline-flex items-center gap-2"
              >
                <ScanLine className="w-4 h-4" /> Scan at door
              </Link>
              <Link
                to={`/events/${event.id}/attendance`}
                className="btn-ghost px-5 py-2.5 rounded text-sm inline-flex items-center gap-2"
              >
                <ClipboardList className="w-4 h-4" /> Attendance
              </Link>
              <Link
                to={`/events/${event.id}/edit`}
                className="text-xs uppercase tracking-[0.2em] text-[#8a8178] hover:text-[#c9a962] flex items-center gap-2 px-5 py-2"
              >
                <Pencil className="w-3 h-3" /> Edit
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-6 mt-8">
            <Stat label="Guest entries" value={stats.total} />
            <Stat label="Accepted" value={stats.accepted} accent="#7d9b7f" />
            <Stat label="Requests" value={stats.requested} accent="#d4a054" />
            <Stat label="Pending" value={stats.pending} accent="#d4a054" />
            <Stat label="Declined" value={stats.declined} accent="#c47865" />
          </div>
          <div className="mt-6">
            <CapacityMeter
              value={stats.acceptedSeats}
              max={event.capacity}
              label="Confirmed vs capacity"
            />
          </div>
        </div>

        {err && (
          <div className="text-sm text-[#c47865] bg-[#c47865]/10 border border-[#c47865]/30 rounded px-4 py-3 mb-6">
            {err}
          </div>
        )}

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          {/* Guest list */}
          <section className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-[#c9a962]">
                  The list
                </div>
                <h2 className="font-display text-2xl text-cream">Guests</h2>
              </div>
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="btn-gold px-4 py-2 rounded text-xs inline-flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />{" "}
                {showInvite ? "Close" : "Invite"}
              </button>
            </div>

            {invitations.length === 0 && !showInvite && (
              <div className="text-center py-14 text-sm text-[#8a8178]">
                No invitations sent yet. Compose the list.
              </div>
            )}

            <div className="space-y-2">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 p-3 rounded border border-[#332e28] hover:border-[#c9a962]/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-[#141210] border border-[#332e28] flex items-center justify-center text-[#c9a962] text-sm font-medium">
                    {inv.guest_name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-cream truncate">
                      {inv.guest_name}
                      {inv.plus_ones > 0 && (
                        <span className="text-[#c9a962] ml-2 text-xs">
                          +{inv.plus_ones}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#8a8178] truncate">
                      {inv.guest_email}
                    </div>
                  </div>
                  <StatusBadge status={inv.status} />
                  {inv.status === "requested" ? (
                    <div className="flex items-center">
                      <button
                        onClick={() => reviewRequest(inv, "accepted")}
                        disabled={reviewingId === String(inv.id)}
                        title="Approve request and issue QR pass"
                        className="p-2 text-[#7d9b7f] hover:text-cream disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => reviewRequest(inv, "declined")}
                        disabled={reviewingId === String(inv.id)}
                        title="Decline request"
                        className="p-2 text-[#c47865] hover:text-cream disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => emailInvite(inv)}
                        title="Compose invitation email"
                        className="p-2 text-[#8a8178] hover:text-[#c9a962]"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => copyLink(inv)}
                        title="Copy invite link"
                        className="p-2 text-[#8a8178] hover:text-[#c9a962]"
                      >
                        {copiedId === inv.id ? (
                          <Check className="w-3.5 h-3.5 text-[#7d9b7f]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </>
                  )}
                  <button
                    disabled={inv.status === "requested"}
                    onClick={() => removeInvite(inv)}
                    title="Rescind invitation"
                    className="p-2 text-[#8a8178] hover:text-[#c47865] disabled:opacity-30"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Invite composer */}
          {showInvite && (
            <aside className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-6 animate-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-[#c9a962]">
                    Compose
                  </div>
                  <h3 className="font-display text-xl text-cream">
                    New invitation
                  </h3>
                </div>
                <div className="flex text-[10px] uppercase tracking-wider border border-[#332e28] rounded overflow-hidden">
                  <button
                    onClick={() => setBulkMode(false)}
                    className={`px-3 py-1 ${!bulkMode ? "bg-[#c9a962] text-[#0c0b0a]" : "text-[#8a8178]"}`}
                  >
                    One
                  </button>
                  <button
                    onClick={() => setBulkMode(true)}
                    className={`px-3 py-1 ${bulkMode ? "bg-[#c9a962] text-[#0c0b0a]" : "text-[#8a8178]"}`}
                  >
                    Bulk
                  </button>
                </div>
              </div>

              {!bulkMode ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[#8a8178] mb-1.5">
                      Name
                    </label>
                    <input
                      className="field"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Marlene Dietrich"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[#8a8178] mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      className="field"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="marlene@…"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[#8a8178] mb-1.5">
                      Plus ones
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      className="field"
                      value={plusOnes}
                      onChange={(e) => setPlusOnes(Number(e.target.value))}
                    />
                  </div>
                  <button
                    onClick={addOne}
                    disabled={creating}
                    className="btn-gold w-full py-2.5 rounded text-sm inline-flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <div
                        className="gold-ring"
                        style={{ width: 16, height: 16 }}
                      />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send invitation
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-[#8a8178] leading-relaxed">
                    One guest per line. Format:{" "}
                    <code className="text-[#c9a962]">Name, email</code>
                  </div>
                  <textarea
                    className="field min-h-[180px] font-mono text-xs"
                    value={bulk}
                    onChange={(e) => setBulk(e.target.value)}
                    placeholder={
                      "Ada Lovelace, ada@example.com\nAlan Turing, alan@example.com"
                    }
                  />
                  <button
                    onClick={addBulk}
                    disabled={creating}
                    className="btn-gold w-full py-2.5 rounded text-sm inline-flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <div
                        className="gold-ring"
                        style={{ width: 16, height: 16 }}
                      />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send all
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="hairline my-5 opacity-30" />
              <div className="text-xs text-[#8a8178] leading-relaxed">
                Each invitation carries a private link. Copy it from the list to
                share via your preferred channel.
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-[#8a8178] mb-1">
        {label}
      </div>
      <div
        className="font-display text-4xl"
        style={{ color: accent || "#f3ebe0" }}
      >
        {value}
      </div>
    </div>
  );
}
