import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import TicketCard from "../components/TicketCard";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function MyTickets() {
  const { profile, user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const t = await api.myTickets();
        setTickets(t);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-2">
            Present at the door
          </div>
          <h1 className="font-display text-5xl text-cream">Your passes</h1>
          <p className="text-[#8a8178] mt-2">
            Signed at the server. Present to any door-side scanner.
          </p>
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

        {!loading && tickets.length === 0 && (
          <div className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-14 text-center">
            <div className="corner-tl" />
            <div className="corner-tr" />
            <div className="corner-bl" />
            <div className="corner-br" />
            <h2 className="font-display text-3xl text-cream mb-2">
              No passes yet
            </h2>
            <p className="text-[#8a8178] text-sm mb-6">
              Accept an invitation to receive your first pass.
            </p>
            <Link
              to="/my-invitations"
              className="btn-gold px-6 py-3 rounded text-sm inline-flex items-center gap-2"
            >
              See invitations
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              guestName={t.invitation?.guest_name || profile?.display_name}
              guestEmail={t.invitation?.guest_email || user?.email || undefined}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
