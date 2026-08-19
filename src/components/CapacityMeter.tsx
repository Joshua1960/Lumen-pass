export default function CapacityMeter({
  current,
  capacity,
  label = 'Checked in',
}: {
  current: number;
  capacity: number;
  label?: string;
}) {
  const pct = capacity > 0 ? Math.min(100, Math.round((current / capacity) * 100)) : 0;
  const tone = pct >= 95 ? 'bg-rose' : pct >= 75 ? 'bg-amber' : 'bg-gold';
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-muted">{label}</span>
        <span className="text-sm text-cream">
          <span className="font-display text-lg text-gold-2">{current}</span>
          <span className="text-muted"> / {capacity}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className={`h-full ${tone} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
