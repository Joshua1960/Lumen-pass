import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Download, UserCheck, Undo2 } from "lucide-react";
import Navbar from "../components/Navbar";
import CapacityMeter from "../components/CapacityMeter";
import ActivityFeed from "../components/ActivityFeed";
import { InviteBadge } from "../components/StatusBadge";
import { apiFetch } from "../lib/api";
import { useLiveStream } from "../lib/useLiveStream";
import type {
  AttendanceLog,
  EventRecord,
  HostStats,
  Invitation,
} from "../lib/types";
import {
  exportAttendanceCsv,
  exportEventAnalyticsCsv,
  formatTime,
} from "../lib/format";

const emptyStats: HostStats = {
  guest_count: 0,
  checked_in_count: 0,
  accepted_count: 0,
  declined_count: 0,
  pending_count: 0,
  sent_count: 0,
  plus_ones: 0,
};

export default function Attendance() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<HostStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | AttendanceLog["result"]>("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setError("");
        const data = await apiFetch<{
          event: EventRecord;
          logs: AttendanceLog[];
          invitations: Invitation[];
          stats: HostStats;
        }>(`/api/attendance?event_id=${id}`);
        setEvent(data.event);
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setInvites(Array.isArray(data.invitations) ? data.invitations : []);
        setStats(data.stats || emptyStats);
      } catch (err: unknown) {
        if (!silent)
          setError(
            err instanceof Error ? err.message : "Unable to load attendance",
          );
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Real-time stream: scans land here the moment the door verifies them.
  useLiveStream(load);
  useEffect(() => {
    const t = setInterval(() => load(true), 6000);
    return () => clearInterval(t);
  }, [load]);

  const visibleLogs = useMemo(
    () => (filter === "all" ? logs : logs.filter((l) => l.result === filter)),
    [logs, filter],
  );

  const waiting = invites
    .filter((g) => g.status !== "checked_in" && g.status !== "declined")
    .sort((a, b) => a.guest_name.localeCompare(b.guest_name));

  const override = async (
    invitation_id: number,
    action: "check_in" | "undo",
  ) => {
    setBusyId(invitation_id);
    setError("");
    try {
      await apiFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify({ invitation_id, action }),
      });
      await load(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Override failed");
    } finally {
      setBusyId(null);
    }
  };

  const rate = stats.guest_count
    ? Math.round((stats.checked_in_count / stats.guest_count) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="max-w-6xl mx-auto px-5 py-8">
        <Link
          to={`/events/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-cream mb-6"
        >
          <ArrowLeft size={14} /> Back to evening
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="live-dot" />
              <p className="text-[11px] uppercase tracking-[0.3em] text-gold">
                Live door
              </p>
            </div>
            <h1 className="font-display text-4xl">
              {event?.title || "Attendance"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                event && exportEventAnalyticsCsv(event, invites, logs)
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-xs text-muted hover:text-cream"
            >
              <Download size={13} /> Analytics CSV
            </button>
            <button
              onClick={() =>
                exportAttendanceCsv(logs, event?.title || "attendance")
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-xs text-muted hover:text-cream"
            >
              <Download size={13} /> Scans CSV
            </button>
            <button
              onClick={() => load()}
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-cream"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-rose mb-4">{error}</p>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="font-display text-3xl text-gold-2">
              {stats.checked_in_count}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted mt-1">
              Checked in
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="font-display text-3xl text-cream">
              {stats.guest_count}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted mt-1">
              Registered
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="font-display text-3xl text-sage">{rate}%</p>
            <p className="text-[10px] uppercase tracking-widest text-muted mt-1">
              Door rate
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="font-display text-3xl text-amber">{waiting.length}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted mt-1">
              Still expected
            </p>
          </div>
        </div>

        {event && (
          <div className="mb-8">
            <CapacityMeter
              current={stats.checked_in_count}
              capacity={event.capacity}
            />
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="gold-ring" />
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 rounded-2xl border border-line bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="font-display text-2xl">Scan book</h2>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    "all",
                    "success",
                    "override",
                    "duplicate",
                    "invalid",
                    "declined",
                    "undo",
                  ] as const
                ).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider border ${
                      filter === f
                        ? "border-gold/50 text-gold-2 bg-gold/10"
                        : "border-line text-muted"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <ActivityFeed logs={visibleLogs} />
          </section>

          <section className="lg:col-span-2 rounded-2xl border border-line bg-card p-5">
            <h2 className="font-display text-2xl mb-1">Manual override</h2>
            <p className="text-xs text-muted mb-4">
              Admit a guest without a scan, or reverse a mistaken check-in.
            </p>
            <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
              {invites
                .slice()
                .sort((a, b) => a.guest_name.localeCompare(b.guest_name))
                .map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-2 rounded-xl border border-line/80 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-cream truncate">
                        {g.guest_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <InviteBadge status={g.status} />
                        {g.checked_in_at && (
                          <span className="text-[10px] text-muted">
                            {formatTime(g.checked_in_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    {g.status === "checked_in" ? (
                      <button
                        disabled={busyId === g.id}
                        onClick={() => override(g.id, "undo")}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-line text-[11px] text-muted hover:text-cream disabled:opacity-50"
                      >
                        <Undo2 size={11} /> Undo
                      </button>
                    ) : g.status !== "declined" ? (
                      <button
                        disabled={busyId === g.id}
                        onClick={() => override(g.id, "check_in")}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gold/15 border border-gold/30 text-[11px] text-gold-2 hover:bg-gold/25 disabled:opacity-50"
                      >
                        <UserCheck size={11} /> Admit
                      </button>
                    ) : null}
                  </div>
                ))}
              {!invites.length && !loading && (
                <p className="text-sm text-muted">No guests on this list.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
