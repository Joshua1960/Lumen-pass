import { Link } from 'react-router-dom';
import { MapPin, Users } from 'lucide-react';
import type { EventRecord } from '../lib/types';
import { formatShortDate, formatTime, isUpcoming } from '../lib/format';
import { EventBadge } from './StatusBadge';
import CapacityMeter from './CapacityMeter';

export default function EventCard({ event }: { event: EventRecord }) {
  const upcoming = isUpcoming(event.starts_at) && event.status !== 'cancelled';
  return (
    <Link
      to={`/events/${event.id}`}
      className="group block rounded-2xl overflow-hidden bg-card border border-line hover:border-gold/30 transition-all card-glow"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={event.cover_image}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <EventBadge status={event.status} />
          {upcoming && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wide border border-gold/40 bg-ink/60 text-gold-2">
              Upcoming
            </span>
          )}
        </div>
      </div>
      <div className="p-5 -mt-2 relative">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold mb-1">
          {formatShortDate(event.starts_at)} · {formatTime(event.starts_at)}
        </p>
        <h3 className="font-display text-2xl text-cream leading-tight mb-2 group-hover:text-gold-2 transition-colors">
          {event.title}
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-muted mb-4">
          <MapPin size={13} className="text-gold/70" /> {event.venue}
        </p>
        <CapacityMeter current={event.checked_in_count || 0} capacity={event.capacity} />
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Users size={12} /> {event.guest_count || 0} invited
          {(event.accepted_count || 0) > 0 && <span>· {event.accepted_count} accepted</span>}
        </div>
      </div>
    </Link>
  );
}
