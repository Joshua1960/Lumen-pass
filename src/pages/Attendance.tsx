import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import { api } from "../lib/api";
import { formatTime, formatDate } from "../lib/format";
import { ArrowLeft, Download, Search, Users } from "lucide-react";

interface Row {
  invitation_id: string;
  guest_name: string;
  guest_email: string;
  plus_ones: number;
  status: string;
  ticket_id: string | null;
  checked_in_at: string | null;
}

export default function Attendance() {
  const { id } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<
    "all" | "arrived" | "awaiting" | "declined"
  >("all");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ev, r] = await Promise.all([api.getEvent(id), api.attendance(id)]);
      setEvent(ev);
      setRows(r);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [id]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (
          q &&
          !(
            r.guest_name.toLowerCase().includes(q.toLowerCase()) ||
            r.guest_email.toLowerCase().includes(q.toLowerCase())
          )
        )
          return false;
        if (filter === "arrived") return Boolean(r.checked_in_at);
        if (filter === "awaiting")
          return !r.checked_in_at && r.status !== "declined";
        if (filter === "declined") return r.status === "declined";
        return true;
      }),
    [rows, q, filter],
  );

  const arrived = rows.filter((r) => r.checked_in_at).length;
  const accepted = rows.filter((r) => r.status === "accepted").length;
  const declined = rows.filter((r) => r.status === "declined").length;

  const exportCSV = () => {
    const header = [
      "Guest",
      "Email",
      "Plus ones",
      "Invitation status",
      "Ticket",
      "Checked in at",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          JSON.stringify(r.guest_name),
          JSON.stringify(r.guest_email),
          String(r.plus_ones),
          r.status,
          r.ticket_id ? r.ticket_id.slice(0, 8) : "",
          r.checked_in_at ? new Date(r.checked_in_at).toISOString() : "",
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(event?.title || "attendance").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <Link
          to={`/events/${id}`}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#8a8178] hover:text-[#c9a962] mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> Event
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-2">
              Attendance
            </div>
            <h1 className="font-display text-5xl text-cream">{event?.title}</h1>
            <p className="text-[#8a8178] mt-1 text-sm">
              {formatDate(event?.starts_at)}
            </p>
          </div>
          <button
            onClick={exportCSV}
            className="btn-ghost px-4 py-2.5 rounded text-sm inline-flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-3 mb-6">
          {[
            { k: "all", label: "All", value: rows.length, color: "#f3ebe0" },
            {
              k: "arrived",
              label: "Arrived",
              value: arrived,
              color: "#7d9b7f",
            },
            {
              k: "awaiting",
              label: "Awaiting",
              value: accepted - arrived,
              color: "#d4a054",
            },
            {
              k: "declined",
              label: "Declined",
              value: declined,
              color: "#c47865",
            },
          ].map((s) => (
            <button
              key={s.k}
              onClick={() => setFilter(s.k as any)}
              className={`text-left p-4 rounded-lg border transition-colors ${filter === s.k ? "border-[#c9a962] bg-[#c9a962]/5" : "border-[#332e28] hover:border-[#c9a962]/30"}`}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8a8178]">
                {s.label}
              </div>
              <div className="font-display text-3xl" style={{ color: s.color }}>
                {s.value}
              </div>
            </button>
          ))}
        </div>

        <div className="relative bg-[#211d19] border border-[#332e28] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#332e28] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#8a8178]" />
            <input
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#6b6259]"
              placeholder="Search by name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-[#8a8178]">
              <Users className="w-8 h-8 mx-auto text-[#c9a962]/30 mb-3" />
              No matching guests.
            </div>
          ) : (
            <div className="divide-y divide-[#332e28]">
              <div className="grid grid-cols-[1fr_1fr_100px_120px_130px] px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-[#8a8178]">
                <div>Guest</div>
                <div>Email</div>
                <div>Plus</div>
                <div>Status</div>
                <div>Arrived</div>
              </div>
              {filtered.map((r) => (
                <div
                  key={r.invitation_id}
                  className="grid grid-cols-[1fr_1fr_100px_120px_130px] px-5 py-3 items-center text-sm hover:bg-[#141210]/50"
                >
                  <div className="text-cream truncate">{r.guest_name}</div>
                  <div className="text-[#8a8178] truncate">{r.guest_email}</div>
                  <div className="text-[#c9a962]">
                    {r.plus_ones > 0 ? `+${r.plus_ones}` : ""}
                  </div>
                  <div>
                    <StatusBadge
                      status={r.checked_in_at ? "arrived" : r.status}
                    />
                  </div>
                  <div className="text-[#8a8178] text-xs">
                    {r.checked_in_at ? formatTime(r.checked_in_at) : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
