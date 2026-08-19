import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  CalendarDays,
  Users,
  ScanLine,
  Activity,
  Download,
  Radio,
} from "lucide-react";
import Navbar from "../components/Navbar";
import EventCard from "../components/EventCard";
import ActivityFeed from "../components/ActivityFeed";
import CapacityMeter from "../components/CapacityMeter";
import type { AttendanceLog, EventRecord, HostStats } from "../lib/types";
import { apiFetch } from "../lib/api";
import { exportAttendanceCsv, isUpcoming } from "../lib/format";

const emptyStats: HostStats = {
  guest_count: 0,
  checked_in_count: 0,
  accepted_count: 0,
  declined_count: 0,
  pending_count: 0,
  sent_count: 0,
  plus_ones: 0,
  event_count: 0,
  active_events: 0,
};

export default function Dashboard() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [stats, setStats] = useState<HostStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setError("");
      const [eventRows, activity] = await Promise.all([
        apiFetch<EventRecord[]>("/api/events"),
        apiFetch<{ logs: AttendanceLog[]; stats: HostStats }>(
          "/api/attendance",
        ),
      ]);
      setEvents(Array.isArray(eventRows) ? eventRows : []);
      setLogs(Array.isArray(activity.logs) ? activity.logs : []);
      setStats(activity.stats || emptyStats);
    } catch (err: unknown) {
      if (!silent)
        setError(
          err instanceof Error ? err.message : "Unable to load evenings",
        );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(() => load(true), 8000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = events.filter((e) => {
    if (filter === "upcoming")
      return isUpcoming(e.starts_at) && e.status !== "cancelled";
    if (filter === "past")
      return !isUpcoming(e.starts_at) || e.status === "cancelled";
    return true;
  });

  const activeEvents = useMemo(
    () =>
      events.filter((e) => e.status === "published" && isUpcoming(e.starts_at)),
    [events],
  );

  const arrivals = logs.filter(
    (l) => l.result === "success" || l.result === "override",
  );
  const rate = stats.guest_count
    ? Math.round((stats.checked_in_count / stats.guest_count) * 100)
    : 0;
  const expected = stats.guest_count + stats.plus_ones;

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="max-w-6xl mx-auto px-5 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">
              Host desk
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">
              The evening book
            </h1>
            <p className="text-muted text-sm mt-2">
              Live counts, arrivals, and every door you keep.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportAttendanceCsv(logs, "lumen-host-activity")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-line text-sm text-muted hover:text-cream"
            >
              <Download size={15} /> Export activity
            </button>
            <Link
              to="/events/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-ink text-sm hover:bg-gold-2 transition-colors"
            >
              <Plus size={16} /> New event
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            {
              icon: CalendarDays,
              label: "Active events",
              value: stats.active_events ?? activeEvents.length,
            },
            {
              icon: Users,
              label: "Registered invitees",
              value: stats.guest_count,
            },
            {
              icon: ScanLine,
              label: "Checked in",
              value: stats.checked_in_count,
            },
            { icon: Activity, label: "Check-in rate", value: `${rate}%` },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-line bg-card p-5"
            >
              <s.icon size={16} className="text-gold mb-3" />
              <p className="font-display text-3xl text-gold-2">{s.value}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-muted mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-6 mb-12">
          <section className="lg:col-span-3 rounded-2xl border border-line bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="live-dot" />
                <h2 className="font-display text-2xl">Arrivals</h2>
              </div>
              <p className="text-[11px] uppercase tracking-widest text-muted inline-flex items-center gap-1.5">
                <Radio size={12} /> Live
              </p>
            </div>
            <p className="text-xs text-muted mb-3">
              {arrivals.length} admitted · {logs.length} scans recorded across
              your doors
            </p>
            <ActivityFeed logs={logs.slice(0, 12)} />
          </section>

          <section className="lg:col-span-2 rounded-2xl border border-line bg-card p-5 sm:p-6">
            <h2 className="font-display text-2xl mb-4">Tonight&apos;s rooms</h2>
            {activeEvents.length === 0 && (
              <p className="text-sm text-muted">
                No published evenings ahead. Compose one to open a door.
              </p>
            )}
            <div className="space-y-5">
              {activeEvents.slice(0, 4).map((e) => (
                <Link key={e.id} to={`/events/${e.id}`} className="block group">
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <p className="text-cream group-hover:text-gold-2 truncate">
                      {e.title}
                    </p>
                    <span className="text-[11px] text-muted shrink-0">
                      {e.guest_count || 0} invited
                    </span>
                  </div>
                  <CapacityMeter
                    current={e.checked_in_count || 0}
                    capacity={e.capacity}
                  />
                </Link>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t border-line grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="font-display text-2xl text-gold-2">
                  {stats.accepted_count}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted">
                  Accepted
                </p>
              </div>
              <div>
                <p className="font-display text-2xl text-cream/80">
                  {expected}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted">
                  With plus-ones
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="flex gap-2 mb-6">
          {(["all", "upcoming", "past"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-[0.14em] border transition-colors ${
                filter === f
                  ? "border-gold/50 text-gold-2 bg-gold/10"
                  : "border-line text-muted hover:text-cream"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="gold-ring" />
          </div>
        )}
        {error && <p className="text-rose text-sm mb-6">{error}</p>}

        {!loading && !filtered.length && (
          <div className="rounded-2xl border border-dashed border-line py-20 text-center">
            <img
              src="/images/flourish.png"
              alt=""
              className="h-8 mx-auto mb-6 opacity-70"
            />
            <p className="font-display text-2xl mb-2">No evenings yet</p>
            <p className="text-muted text-sm mb-6">
              Compose your first invitation and seal the door.
            </p>
            <Link
              to="/events/new"
              className="text-gold-2 text-sm hover:underline"
            >
              Create an event
            </Link>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </main>
    </div>
  );
}
