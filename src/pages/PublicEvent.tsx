import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { formatDate, formatTime } from "../lib/format";
import type { Event } from "../lib/types";

type PublicEventDetails = Event & { remaining_capacity: number };

export default function PublicEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PublicEventDetails | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .getPublicEvent(id)
      .then(setEvent)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to load event."),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!id) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await api.requestPublicEvent({
        event_id: id,
        guest_name: name,
        guest_email: email,
        website,
      });
      navigate(`/guest-pass/${result.claim_token}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#8a8178] hover:text-[#c9a962] mb-8"
        >
          <ArrowLeft className="w-3 h-3" /> All events
        </Link>
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="gold-ring" />
          </div>
        ) : event ? (
          <>
            <div className="mb-8">
              <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-2">
                Request an invitation
              </div>
              <h1 className="font-display text-5xl text-cream mb-4">
                {event.title}
              </h1>
              <div className="space-y-2 text-sm text-[#8a8178]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#c9a962]" />
                  {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#c9a962]" />
                  {event.venue}{event.address ? ` · ${event.address}` : ""}
                </div>
              </div>
              {event.description && (
                <p className="text-[#8a8178] leading-relaxed mt-5">
                  {event.description}
                </p>
              )}
              {event.dress_code && (
                <p className="text-sm text-[#8a8178] mt-3">
                  Dress code: {event.dress_code}
                </p>
              )}
              {event.remaining_capacity < 1 && (
                <p className="text-sm text-[#c47865] mt-4">
                  This event is full and is no longer accepting attendance requests.
                </p>
              )}
            </div>

            {event.remaining_capacity > 0 && (
              <form
                onSubmit={submit}
                className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-8 space-y-5"
              >
              <div className="corner-tl" />
              <div className="corner-tr" />
              <div className="corner-bl" />
              <div className="corner-br" />
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
                  Your name
                </label>
                <input
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
                  Email address
                </label>
                <input
                  className="field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={320}
                  autoComplete="email"
                  required
                />
                <p className="text-xs text-[#8a8178] mt-2">
                  Used by the organiser to identify your request. No verification or account is required.
                </p>
              </div>
              <div className="absolute -left-[10000px]" aria-hidden="true">
                <label htmlFor="website">Leave this field empty</label>
                <input
                  id="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              {error && (
                <div className="text-sm text-[#c47865] bg-[#c47865]/10 border border-[#c47865]/30 rounded px-4 py-3">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="btn-gold w-full py-3 rounded text-sm disabled:opacity-50"
              >
                {submitting ? "Sending request…" : "Send attendance request"}
              </button>
              </form>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-[#8a8178]">
            {error || "This event is no longer available."}
          </div>
        )}
      </main>
    </div>
  );
}
