import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, ArrowUpRight } from 'lucide-react';
import { formatDate, formatTime, countdown } from '../lib/format';
import type { Event } from '../lib/types';

export default function EventCard({ event, invited, ticketCount = 0, checkedIn = 0 }: { event: Event; invited?: number; ticketCount?: number; checkedIn?: number }) {
  return (
    <Link to={`/events/${event.id}`} className="group block relative bg-[#211d19] rounded-xl border border-[#332e28] hover:border-[#c9a962]/40 transition-all card-glow overflow-hidden">
      <div className="corner-tl" />
      <div className="corner-tr" />
      <div className="corner-bl" />
      <div className="corner-br" />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#c9a962] mb-2">{countdown(event.starts_at)}</div>
            <h3 className="font-display text-2xl text-cream leading-tight">{event.title}</h3>
          </div>
          <ArrowUpRight className="w-4 h-4 text-[#8a8178] group-hover:text-[#c9a962] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="hairline my-4 opacity-40" />
        <div className="space-y-2 text-sm text-[#8a8178]">
          <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" />{formatDate(event.starts_at)} · {formatTime(event.starts_at)}</div>
          <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{event.venue}</div>
          <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />{ticketCount} confirmed / {event.capacity} capacity</div>
        </div>
        <div className="mt-5 flex items-center gap-4 text-xs">
          <span className="text-[#8a8178]">Invited <span className="text-cream ml-1">{invited ?? 0}</span></span>
          <span className="text-[#8a8178]">Arrived <span className="text-[#7d9b7f] ml-1">{checkedIn}</span></span>
        </div>
      </div>
    </Link>
  );
}
