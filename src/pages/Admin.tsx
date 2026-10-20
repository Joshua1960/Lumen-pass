import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import { api } from "../lib/api";
import { formatDate, formatTime, relativeTime } from "../lib/format";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ScanLine,
  ArrowRight,
  ShieldCheck,
  Activity,
  AlertCircle,
} from "lucide-react";

interface AdminData {
  totals: {
    events: number;
    invitations: number;
    accepted: number;
    declined: number;
    tickets: number;
    arrived: number;
    scans: number;
    valid: number;
    duplicate: number;
    invalid: number;
  };
  events: Array<{
    id: string;
    title: string;
    venue: string;
    starts_at: string;
    capacity: number;
    invited: number;
    accepted: number;
    declined: number;
    arrived: number;
    tickets: number;
  }>;
  recent_scans: Array<{
    id: number;
    result: string;
    guest_name: string | null;
    created_at: string;
    event_title?: string;
    event_id: string;
  }>;
}

export default function Admin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.admin();
      setData(d);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  if (loading && !data)
    return (
      <div className="min-h-screen bg-ink grain">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="gold-ring" />
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-ink grain">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div
            className="text-[11px] uppercase tracking-[0.3em] text-gold
           mb-2 flex items-center gap-2"
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Admin · overview
          </div>
          <h1 className="font-display text-5xl text-cream">The Ledger</h1>
          <p className="text-muted mt-2">
            Every event, every guest, every door in one place.
          </p>
        </div>

        {err && (
          <div className="text-sm text-rose bg-rose/10 border border-rose/30 rounded px-4 py-3 mb-6 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}

        {data && (
          <>
            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <Tile label="Events" value={data.totals.events} />
              <Tile
                label="Guests invited"
                value={data.totals.invitations}
                sub={`${data.totals.accepted} accepted · ${data.totals.declined} declined`}
              />
              <Tile
                label="Passes issued"
                value={data.totals.tickets}
                sub={`${data.totals.arrived} arrived`}
                accent="#7d9b7f"
              />
              <Tile
                label="Recent scans"
                value={data.totals.scans}
                sub={`${data.totals.valid} valid · ${data.totals.duplicate} dup · ${data.totals.invalid} bad`}
              />
            </div>

            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
              {/* Events roll-up */}
              <section className="relative bg-card border border-line rounded-xl p-6">
                <div className="text-[10px] uppercase tracking-[0.25em] text-gold mb-4 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> Events roll-up
                </div>
                {data.events.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted">
                    No events yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.events.map((e) => (
                      <Link
                        key={e.id}
                        to={`/events/${e.id}`}
                        className="flex items-center gap-4 p-3 rounded border border-line hover:border-gold/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-cream truncate">
                            {e.title}
                          </div>
                          <div className="text-[11px] text-muted truncate">
                            {formatDate(e.starts_at)} · {e.venue}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="text-center">
                            <div className="text-[9px] uppercase tracking-wider text-muted">
                              Inv
                            </div>
                            <div className="text-cream">{e.invited}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[9px] uppercase tracking-wider text-muted">
                              Yes
                            </div>
                            <div className="text-[#7d9b7f]">{e.accepted}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[9px] uppercase tracking-wider text-[#8a8178]">
                              Arr
                            </div>
                            <div className="text-[#c9a962]">
                              {e.arrived}/{e.capacity}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-sage" />
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Global scan feed */}
              <aside className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-6">
                <div className="text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-4 flex items-center gap-2">
                  <ScanLine className="w-3.5 h-3.5" /> Global scan log
                </div>
                {data.recent_scans.length === 0 ? (
                  <div className="text-center py-10 text-sm text-[#8a8178]">
                    No scans yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                    {data.recent_scans.map((l) => (
                      <div
                        key={l.id}
                        className="p-3 rounded border border-[#332e28]"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="text-sm text-cream truncate">
                            {l.guest_name || "Unknown ticket"}
                          </div>
                          <StatusBadge status={l.result} />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#8a8178]">
                          <span className="truncate">{l.event_title}</span>
                          <span>
                            {relativeTime(l.created_at)} ·{" "}
                            {formatTime(l.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: any;
  label: string;
  value: number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-5 card-glow">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#8a8178] mb-2">
        {label}
      </div>
      <div
        className="font-display text-4xl"
        style={{ color: accent || "#f3ebe0" }}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-[#8a8178] mt-1">{sub}</div>}
    </div>
  );
}
