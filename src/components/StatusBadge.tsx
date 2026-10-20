export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: '#d4a054', bg: 'rgba(212,160,84,0.1)', label: 'Pending' },
    requested: { color: '#d4a054', bg: 'rgba(212,160,84,0.1)', label: 'Awaiting review' },
    accepted: { color: '#7d9b7f', bg: 'rgba(125,155,127,0.1)', label: 'Accepted' },
    declined: { color: '#c47865', bg: 'rgba(196,120,101,0.1)', label: 'Declined' },
    arrived: { color: '#7d9b7f', bg: 'rgba(125,155,127,0.15)', label: 'Arrived' },
    valid: { color: '#7d9b7f', bg: 'rgba(125,155,127,0.15)', label: 'Valid' },
    duplicate: { color: '#d4a054', bg: 'rgba(212,160,84,0.15)', label: 'Duplicate' },
    invalid: { color: '#c47865', bg: 'rgba(196,120,101,0.15)', label: 'Invalid' },
  };
  const s = map[status] || { color: '#8a8178', bg: 'rgba(138,129,120,0.1)', label: status };
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border" style={{ color: s.color, background: s.bg, borderColor: s.color + '55' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}
