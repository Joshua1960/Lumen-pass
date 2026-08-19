import type { EventStatus, InviteStatus } from '../lib/types';

const inviteStyles: Record<InviteStatus, string> = {
  pending: 'bg-white/5 text-muted border-white/10',
  sent: 'bg-gold/10 text-gold-2 border-gold/20',
  accepted: 'bg-sage/15 text-sage border-sage/30',
  declined: 'bg-rose/15 text-rose border-rose/30',
  checked_in: 'bg-gold/20 text-gold-2 border-gold/40',
};

const eventStyles: Record<EventStatus, string> = {
  draft: 'bg-white/5 text-muted border-white/10',
  published: 'bg-sage/15 text-sage border-sage/30',
  cancelled: 'bg-rose/15 text-rose border-rose/30',
};

const inviteLabel: Record<InviteStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  checked_in: 'Checked in',
};

const eventLabel: Record<EventStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  cancelled: 'Cancelled',
};

export function InviteBadge({ status }: { status: InviteStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] tracking-wide uppercase border ${inviteStyles[status] || inviteStyles.pending}`}>
      {inviteLabel[status] || status}
    </span>
  );
}

export function EventBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] tracking-wide uppercase border ${eventStyles[status] || eventStyles.draft}`}>
      {eventLabel[status] || status}
    </span>
  );
}
