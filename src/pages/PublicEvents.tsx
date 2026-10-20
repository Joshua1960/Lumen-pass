import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { formatDate, formatTime } from "../lib/format";
import type { Event } from "../lib/types";

type PublicEventRecord = Event & { remaining_capacity: number };

export default function PublicEvents() {
  const [events, setEvents] = useState<PublicEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listPublicEvents()
      .then(setEvents)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to load events."),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-2">
            Open invitations
          </div>
          <h1 className="font-display text-5xl text-cream">Upcoming events</h1>
          <p className="text-[#8a8178] mt-3">
            Request a place with your name and email. No attendee account needed.
          </p>
        </div>

        {error && (
          <div className="text-sm text-[#c47865] bg-[#c47865]/10 border border-[#c47865]/30 rounded px-4 py-3 mb-6">
            {error}
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="gold-ring" />
          </div>
        )}
        {!loading && !error && events.length === 0 && (
          <div className="bg-[#211d19] border border-[#332e28] rounded-xl p-12 text-center text-[#8a8178]">
            There are no upcoming events with space available right now.
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <article
              key={event.id}
              className="bg-[#211d19] border border-[#332e28] rounded-xl overflow-hidden"
            >
              {event.cover_url ? (
                <img
                  src={event.cover_url}
                  alt=""
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="h-48 bg-gradient-to-br from-[#332e28] to-[#141210]" />
              )}
              <div className="p-6">
                <h2 className="font-display text-2xl text-cream mb-3">
                  {event.title}
                </h2>
                <div className="space-y-2 text-sm text-[#8a8178]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#c9a962]" />
                    {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#c9a962]" />
                    {event.venue}
                  </div>
                  <div>{event.remaining_capacity} places available</div>
                </div>
                {event.description && (
                  <p className="text-sm text-[#8a8178] leading-relaxed mt-4 line-clamp-3">
                    {event.description}
                  </p>
                )}
                <Link
                  to={`/events/${event.id}/request`}
                  className="btn-gold px-5 py-2.5 rounded text-sm inline-flex items-center gap-2 mt-6"
                >
                  Request to attend <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
