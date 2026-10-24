import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { formatDate, formatTime, countdown } from "../lib/format";
import type { Event } from "../lib/types";

export default function EventCard({
  event,
  invited,
  ticketCount = 0,
  checkedIn = 0,
  onDelete,
  deleting = false,
}: {
  event: Event;
  invited?: number;
  ticketCount?: number;
  checkedIn?: number;
  onDelete?: (eventId: string) => void;
  deleting?: boolean;
}) {
  return (
    <article
      className="group relative bg-[#211d19] rounded-xl border border-[#332e28] hover:border-[#c9a962]/40 transition-all card-glow overflow-hidden"
    >
      <div className="corner-tl" />
      <div className="corner-tr" />
      <div className="corner-bl" />
      <div className="corner-br" />
      <Link to={`/events/${event.id}`} className="block p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className={onDelete ? "pr-10" : ""}>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#c9a962] mb-2">
              {countdown(event.starts_at)}
            </div>
            <h3 className="font-display text-2xl text-cream leading-tight">
              {event.title}
            </h3>
          </div>
        </div>
        <div className="hairline my-4 opacity-40" />
        <div className="space-y-2 text-sm text-[#8a8178]">
          <div className="flex items-center gap-2">
            {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
          </div>
          <div className="flex items-center gap-2">{event.venue}</div>
          <div className="flex items-center gap-2">
            {ticketCount} confirmed / {event.capacity} capacity
          </div>
        </div>
        <div className="mt-5 flex items-center gap-4 text-xs">
          <span className="text-[#8a8178]">
            Invited <span className="text-cream ml-1">{invited ?? 0}</span>
          </span>
          <span className="text-[#8a8178]">
            Arrived <span className="text-[#7d9b7f] ml-1">{checkedIn}</span>
          </span>
        </div>
      </Link>
      {onDelete && (
        <button
          type="button"
          title="Delete event"
          aria-label={`Delete ${event.title}`}
          disabled={deleting}
          onClick={() => onDelete(event.id)}
          className="absolute top-5 right-5 z-10 p-2 rounded text-[#8a8178] hover:text-[#c47865] hover:bg-[#c47865]/10 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </article>
  );
}
