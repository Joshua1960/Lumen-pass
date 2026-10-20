import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import EventCard from "../components/EventCard";
import { api } from "../lib/api";
import { Plus, Calendar } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface EventWithStats {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  venue: string;
  address: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number;
  dress_code: string | null;
  cover_url: string | null;
  created_at: string;
  invitation_count: number;
  ticket_count: number;
  checked_in_count: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.listEvents();
      setEvents(list);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const upcoming = events.filter(
    (e) => new Date(e.starts_at).getTime() > Date.now() - 6 * 3600 * 1000,
  );
  const past = events.filter((e) => !upcoming.includes(e));

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-5xl text-cream">
              Hello, {profile?.display_name?.split(" ")[0] || "friend"}
            </h1>
            <p className="text-[#8a8178] mt-2">
              Compose the room. Send invitations. Verify at the door.
            </p>
          </div>
          <Link
            to="/events/new"
            className="btn-gold px-6 py-3 rounded text-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New event
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="gold-ring" />
          </div>
        )}
        {err && (
          <div className="text-sm text-[#c47865] bg-[#c47865]/10 border border-[#c47865]/30 rounded px-4 py-3 mb-6">
            {err}
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-16 text-center">
            <div className="corner-tl" />
            <div className="corner-tr" />
            <div className="corner-bl" />
            <div className="corner-br" />
            <Calendar className="w-10 h-10 text-[#c9a962] mx-auto mb-4 opacity-70" />
            <h2 className="font-display text-3xl text-cream mb-2">No evengt</h2>
            <p className="text-[#8a8178] max-w-md mx-auto mb-6">
              Create you first event.
            </p>
            <Link
              to="/events/new"
              className="btn-gold px-6 py-3 rounded text-sm inline-flex items-center gap-2"
            >
              Create first event
            </Link>
          </div>
        )}

        {!loading && upcoming.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962]">
                Upcoming · {upcoming.length}
              </h2>
              <div className="flex-1 hairline opacity-40" />
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {upcoming.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  invited={e.invitation_count}
                  ticketCount={e.ticket_count}
                  checkedIn={e.checked_in_count}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && past.length > 0 && (
          <section>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-[11px] uppercase tracking-[0.3em] text-[#8a8178]">
                Past · {past.length}
              </h2>
              <div className="flex-1 hairline opacity-20" />
            </div>
            <div className="grid md:grid-cols-2 gap-5 opacity-70">
              {past.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  invited={e.invitation_count}
                  ticketCount={e.ticket_count}
                  checkedIn={e.checked_in_count}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
