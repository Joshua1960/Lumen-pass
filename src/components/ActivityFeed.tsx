import { Link } from 'react-router-dom';
import type { AttendanceLog } from '../lib/types';
import { formatRelative } from '../lib/format';

const resultStyle: Record<string, string> = {
  success: 'text-sage',
  override: 'text-gold-2',
  duplicate: 'text-amber',
  invalid: 'text-rose',
  declined: 'text-rose',
  cancelled: 'text-rose',
  undo: 'text-muted',
};

const resultLabel: Record<string, string> = {
  success: 'Arrived',
  override: 'Host override',
  duplicate: 'Already in',
  invalid: 'Unknown seal',
  declined: 'Declined',
  cancelled: 'Cancelled',
  undo: 'Reversed',
};

export default function ActivityFeed({
  logs,
  empty = 'No arrivals yet. The door is waiting.',
  compact = false,
}: {
  logs: AttendanceLog[];
  empty?: string;
  compact?: boolean;
}) {
  if (!logs.length) {
    return <p className="text-sm text-muted text-center py-10">{empty}</p>;
  }

  return (
    <ol className="space-y-0 divide-y divide-line/70">
      {logs.map((log) => (
        <li key={log.id} className={`flex items-start gap-3 ${compact ? 'py-2.5' : 'py-3.5'}`}>
          <span
            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
              log.result === 'success' || log.result === 'override' ? 'bg-sage' : log.result === 'duplicate' ? 'bg-amber' : 'bg-rose/80'
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-cream truncate">{log.guest_name || 'Unknown token'}</p>
              <p className="text-[11px] text-muted shrink-0">{formatRelative(log.created_at)}</p>
            </div>
            <p className="text-xs text-muted mt-0.5">
              <span className={resultStyle[log.result] || 'text-muted'}>{resultLabel[log.result] || log.result}</span>
              {log.event_title && (
                <>
                  {' · '}
                  <Link to={`/events/${log.event_id}`} className="hover:text-gold-2">
                    {log.event_title}
                  </Link>
                </>
              )}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
