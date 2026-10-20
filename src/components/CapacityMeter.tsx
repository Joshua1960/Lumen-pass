export default function CapacityMeter({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = pct > 90 ? '#c47865' : pct > 70 ? '#d4a054' : '#c9a962';
  return (
    <div>
      {label && <div className="flex items-baseline justify-between mb-2">
        <div className="text-xs uppercase tracking-[0.2em] text-[#8a8178]">{label}</div>
        <div className="text-sm text-cream"><span className="font-display text-xl text-[#c9a962]">{value}</span> <span className="text-[#8a8178]">/ {max}</span></div>
      </div>}
      <div className="h-1.5 bg-[#141210] rounded-full overflow-hidden border border-[#332e28]">
        <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, #e8d5a3)` }} />
      </div>
    </div>
  );
}
