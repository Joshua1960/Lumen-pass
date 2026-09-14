import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Clock, Shirt } from "lucide-react";
import TicketCard from "../components/TicketCard";
import { InviteBadge } from "../components/StatusBadge";
import VenueMap from "../components/VenueMap";
import type { PublicInvite } from "../lib/types";
import { apiFetch } from "../lib/api";
import { formatDate, formatTime } from "../lib/format";

export default function Invite() {
  const { token } = useParams();
  const [data, setData] = useState<PublicInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const json = await apiFetch<PublicInvite>(
        `/api/invite?token=${encodeURIComponent(token || "")}`,
      );
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invitation not found");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const rsvp = async (status: "accepted" | "declined") => {
    setBusy(true);
    setError("");
    try {
      const json = await apiFetch<PublicInvite>("/api/invite", {
        method: "PUT",
        body: JSON.stringify({ token, status }),
      });
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to RSVP");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="gold-ring" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-6 text-center">
        <img
          src="/images/mark.png"
          alt=""
          className="w-12 h-12 mb-4 opacity-80"
        />
        <p className="font-display text-3xl mb-2">This seal is unknown</p>
        <p className="text-muted text-sm">{error}</p>
      </div>
    );
  }

  const { event, invitation } = data;
  const cancelled = event.status === "cancelled";
  const showQr = !cancelled && invitation.status !== "declined";
  const canRsvp = !cancelled && invitation.status !== "checked_in";

  return (
    <div className="min-h-screen bg-ink">
      <div className="relative h-[46vh] min-h-[280px] overflow-hidden grain">
        <img
          src={event.cover_image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/20" />
        <div className="absolute top-6 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2">
            <img
              src="/images/mark.png"
              alt=""
              className="w-7 h-7 object-contain"
            />
            <span className="font-display tracking-[0.28em] text-sm">
              LUMEN
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 -mt-24 relative pb-16">
        <div className="rounded-3xl bg-card border border-line card-glow p-7 sm:p-9">
          <p className="text-center text-[11px] uppercase tracking-[0.32em] text-gold mb-3">
            You are invited
          </p>
          <img
            src="/images/flourish.png"
            alt=""
            className="h-8 mx-auto mb-5 opacity-80"
          />
          <h1 className="font-display text-4xl sm:text-5xl text-center leading-tight mb-2">
            {event.title}
          </h1>
          <p className="text-center text-muted text-sm mb-6">
            For <span className="text-gold-2">{invitation.guest_name}</span>
          </p>

          {event.description && (
            <p className="text-center text-cream/75 leading-relaxed mb-8">
              {event.description}
            </p>
          )}

          <div className="space-y-3 text-sm mb-8">
            <p className="flex items-start gap-3 text-muted">
              <Clock size={16} className="text-gold mt-0.5 shrink-0" />
              <span>
                <span className="text-cream block">
                  {formatDate(event.starts_at)}
                </span>
                {formatTime(event.starts_at)} – {formatTime(event.ends_at)}
              </span>
            </p>
            <p className="flex items-start gap-3 text-muted">
              <MapPin size={16} className="text-gold mt-0.5 shrink-0" />
              <span>
                <span className="text-cream block">{event.venue}</span>
                {event.address}
              </span>
            </p>
            {event.dress_code && (
              <p className="flex items-center gap-3 text-muted">
                <Shirt size={16} className="text-gold shrink-0" />
                <span className="text-cream">{event.dress_code}</span>
              </p>
            )}
            <div className="pt-2">
              <VenueMap
                venue={event.venue}
                address={event.address}
                height={180}
              />
            </div>
          </div>

          <div className="flex justify-center mb-5">
            <InviteBadge status={invitation.status} />
          </div>

          {cancelled && (
            <p className="text-center text-rose text-sm mb-4">
              This evening has been cancelled.
            </p>
          )}
          {error && (
            <p className="text-center text-rose text-sm mb-4">{error}</p>
          )}

          {canRsvp && (
            <div className="flex gap-2 mb-8">
              <button
                disabled={busy}
                onClick={() => rsvp("accepted")}
                className={`flex-1 py-2.5 rounded-full text-sm transition-colors ${
                  invitation.status === "accepted"
                    ? "bg-sage text-ink"
                    : "bg-gold text-ink hover:bg-gold-2"
                }`}
              >
                {invitation.status === "accepted" ? "Accepted" : "Accept"}
              </button>
              <button
                disabled={busy}
                onClick={() => rsvp("declined")}
                className={`flex-1 py-2.5 rounded-full text-sm border ${
                  invitation.status === "declined"
                    ? "border-rose text-rose bg-rose/10"
                    : "border-line text-muted hover:text-cream"
                }`}
              >
                Decline
              </button>
            </div>
          )}

          {showQr && <TicketCard invitation={invitation} event={event} />}
        </div>
      </div>
    </div>
  );
}
