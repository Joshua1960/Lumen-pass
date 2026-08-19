export function formatDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return '';
  return `${formatShortDate(iso)} · ${formatTime(iso)}`;
}

export function formatRelative(iso?: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function isUpcoming(iso?: string | null) {
  if (!iso) return false;
  return new Date(iso).getTime() > Date.now();
}

export function inviteLink(token: string) {
  return `${window.location.origin}/invite/${token}`;
}

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportInvitationsCsv(
  rows: { guest_name: string; guest_email: string; guest_phone: string; status: string; plus_ones: number; checked_in_at: string | null }[],
  title: string
) {
  const header = 'Name,Email,Phone,Status,Plus Ones,Checked In';
  const body = rows
    .map((r) => [r.guest_name, r.guest_email, r.guest_phone, r.status, r.plus_ones, r.checked_in_at || ''].map(csvEscape).join(','))
    .join('\n');
  downloadCsv(`${title.replace(/\s+/g, '-').toLowerCase()}-guests.csv`, `${header}\n${body}`);
}

export function exportAttendanceCsv(
  logs: { created_at: string; guest_name: string; result: string; event_title?: string }[],
  title: string
) {
  const header = 'Time,Guest,Result,Event';
  const body = logs
    .map((r) => [r.created_at, r.guest_name, r.result, r.event_title || title].map(csvEscape).join(','))
    .join('\n');
  downloadCsv(`${title.replace(/\s+/g, '-').toLowerCase()}-attendance.csv`, `${header}\n${body}`);
}

export function exportEventAnalyticsCsv(
  event: { title: string; venue: string; starts_at: string; capacity: number; status: string },
  invites: { guest_name: string; guest_email: string; guest_phone: string; status: string; plus_ones: number; checked_in_at: string | null; note: string }[],
  logs: { created_at: string; guest_name: string; result: string }[]
) {
  const checked = invites.filter((i) => i.status === 'checked_in').length;
  const accepted = invites.filter((i) => i.status === 'accepted').length;
  const declined = invites.filter((i) => i.status === 'declined').length;
  const rate = invites.length ? Math.round((checked / invites.length) * 100) : 0;
  const lines = [
    'Section,Metric,Value',
    ['Summary', 'Event', event.title].map(csvEscape).join(','),
    ['Summary', 'Venue', event.venue].map(csvEscape).join(','),
    ['Summary', 'Starts', event.starts_at].map(csvEscape).join(','),
    ['Summary', 'Status', event.status].map(csvEscape).join(','),
    ['Summary', 'Capacity', event.capacity].map(csvEscape).join(','),
    ['Summary', 'Registered', invites.length].map(csvEscape).join(','),
    ['Summary', 'Checked in', checked].map(csvEscape).join(','),
    ['Summary', 'Accepted', accepted].map(csvEscape).join(','),
    ['Summary', 'Declined', declined].map(csvEscape).join(','),
    ['Summary', 'Check-in rate %', rate].map(csvEscape).join(','),
    '',
    'Section,Name,Email,Phone,Status,Plus Ones,Checked In,Note',
    ...invites.map((r) =>
      ['Guest', r.guest_name, r.guest_email, r.guest_phone, r.status, r.plus_ones, r.checked_in_at || '', r.note]
        .map(csvEscape)
        .join(',')
    ),
    '',
    'Section,Time,Guest,Result',
    ...logs.map((r) => ['Scan', r.created_at, r.guest_name, r.result].map(csvEscape).join(',')),
  ];
  downloadCsv(`${event.title.replace(/\s+/g, '-').toLowerCase()}-analytics.csv`, lines.join('\n'));
}
