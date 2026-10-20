import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import QRScanner from '../components/QRScanner';
import StatusBadge from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatTime, relativeTime } from '../lib/format';
import { enqueue, list as queueList, remove as queueRemove, count as queueCount } from '../lib/offlineQueue';
import { ArrowLeft, ScanLine, CheckCircle2, AlertTriangle, XCircle, Camera, Users, WifiOff, CloudUpload } from 'lucide-react';

interface ScanResult {
  result: 'valid' | 'duplicate' | 'invalid';
  guest_name?: string | null;
  ticket_id?: string | null;
  message?: string;
  checked_in_at?: string | null;
  plus_ones?: number;
  queued?: boolean;
}

interface LogRow {
  id: number;
  result: 'valid' | 'duplicate' | 'invalid';
  guest_name: string | null;
  created_at: string;
}

export default function Scanner() {
  const { id } = useParams();
  const [flash, setFlash] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [totals, setTotals] = useState({ valid: 0, duplicate: 0, invalid: 0 });
  const [event, setEvent] = useState<any>(null);
  const [manualCode, setManualCode] = useState('');
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queued, setQueued] = useState<number>(id ? queueCount(id) : 0);
  const draining = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [ev, ls] = await Promise.all([api.getEvent(id), api.scanLogs(id, 50)]);
      setEvent(ev);
      setLogs(ls);
      setTotals({
        valid: ls.filter((l: LogRow) => l.result === 'valid').length,
        duplicate: ls.filter((l: LogRow) => l.result === 'duplicate').length,
        invalid: ls.filter((l: LogRow) => l.result === 'invalid').length,
      });
    } catch { /* offline */ }
  }, [id]);

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  // Online/offline listeners
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const beep = (kind: 'valid' | 'bad') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = kind === 'valid' ? 880 : 220;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch { /* noop */ }
  };

  // Drain queued scans when we're back online.
  const drain = useCallback(async () => {
    if (draining.current || !id) return;
    draining.current = true;
    try {
      const items = queueList(id);
      for (const item of items) {
        try {
          await api.scan(item.event_id, item.raw);
          queueRemove(item.id);
          setQueued(queueCount(id));
        } catch {
          // Still offline or transient; stop draining and try later.
          break;
        }
      }
      await load();
    } finally {
      draining.current = false;
    }
  }, [id, load]);

  useEffect(() => {
    if (online) drain();
  }, [online, drain]);

  const handleScan = async (raw: string) => {
    if (!id || busy) return;
    setBusy(true);

    if (!navigator.onLine) {
      try {
        enqueue(id, raw);
        setQueued(queueCount(id));
        setFlash({
          result: 'invalid',
          guest_name: 'Unverified · queued',
          message: 'Saved locally; admission is not confirmed. The server will verify this scan when connectivity returns.',
          queued: true,
        });
        beep('bad');
      } catch (error) {
        setFlash({
          result: 'invalid',
          guest_name: 'Could not queue scan',
          message: error instanceof Error ? error.message : 'Browser storage is unavailable.',
        });
        beep('bad');
      }
      setTimeout(() => { setFlash(null); setBusy(false); }, 1800);
      return;
    }

    try {
      const res = await api.scan(id, raw);
      setFlash(res);
      beep(res.result === 'valid' ? 'valid' : 'bad');
      await load();
      setTimeout(() => { setFlash(null); setBusy(false); }, 2200);
    } catch (error) {
      if (error instanceof TypeError || !navigator.onLine) {
        try {
          enqueue(id, raw);
          setQueued(queueCount(id));
          setFlash({
            result: 'invalid',
            guest_name: 'Unverified · queued',
            message: 'The server could not be reached. Saved locally; this scan is not admission until verified.',
            queued: true,
          });
          beep('bad');
        } catch (queueError) {
          setFlash({
            result: 'invalid',
            guest_name: 'Could not queue scan',
            message: queueError instanceof Error ? queueError.message : 'Browser storage is unavailable.',
          });
          beep('bad');
        }
      } else {
        setFlash({
          result: 'invalid',
          guest_name: 'Verification failed',
          message: error instanceof Error ? error.message : 'The server could not verify this pass.',
        });
        beep('bad');
      }
      setTimeout(() => { setFlash(null); setBusy(false); }, 2000);
    }
  };

  const flashColor = flash?.queued ? '#8a8178' : flash?.result === 'valid' ? '#7d9b7f' : flash?.result === 'duplicate' ? '#d4a054' : '#c47865';
  const FlashIcon = flash?.queued ? CloudUpload : flash?.result === 'valid' ? CheckCircle2 : flash?.result === 'duplicate' ? AlertTriangle : XCircle;

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Link to={`/events/${id}`} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#8a8178] hover:text-[#c9a962] mb-6"><ArrowLeft className="w-3 h-3" /> Event</Link>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-2 flex items-center gap-2">
              <span className="live-dot" /> The door · live
              {!online && (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#c47865] ml-2"><WifiOff className="w-3 h-3" /> Offline</span>
              )}
              {queued > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#d4a054] ml-2"><CloudUpload className="w-3 h-3" /> {queued} queued</span>
              )}
            </div>
            <h1 className="font-display text-5xl text-cream">{event?.title || 'Scanner'}</h1>
          </div>
          <div className="flex gap-3">
            <StatChip label="Arrived" value={totals.valid} color="#7d9b7f" />
            <StatChip label="Duplicates" value={totals.duplicate} color="#d4a054" />
            <StatChip label="Invalid" value={totals.invalid} color="#c47865" />
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
          <div className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-6 overflow-hidden">
            <div className="corner-tl" /><div className="corner-tr" /><div className="corner-bl" /><div className="corner-br" />
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-4 flex items-center gap-2"><Camera className="w-3.5 h-3.5" /> Camera</div>

            <div className="relative">
              <QRScanner onScan={handleScan} paused={busy} />
              {flash && (
                <div className="absolute inset-0 flex items-center justify-center animate-in pointer-events-none" style={{ background: `${flashColor}22`, backdropFilter: 'blur(4px)' }}>
                  <div className="text-center px-6 py-8 rounded-xl border pointer-events-auto" style={{ background: '#0c0b0aee', borderColor: flashColor }}>
                    <FlashIcon className="w-12 h-12 mx-auto mb-3" style={{ color: flashColor }} />
                    <div className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: flashColor }}>
                      {flash.queued ? 'Unverified · queued' : flash.result === 'valid' ? 'Admitted' : flash.result === 'duplicate' ? 'Already inside' : 'Denied'}
                    </div>
                    <div className="font-display text-2xl text-cream mb-1">{flash.guest_name || 'Guest'}</div>
                    {typeof flash.plus_ones === 'number' && flash.plus_ones > 0 && !flash.queued && (
                      <div className="text-xs text-[#c9a962] mb-1">Plus {flash.plus_ones}</div>
                    )}
                    {flash.message && <div className="text-xs text-[#8a8178] max-w-xs mx-auto">{flash.message}</div>}
                    {flash.checked_in_at && flash.result === 'duplicate' && (
                      <div className="text-xs text-[#8a8178] mt-1">Checked in at {formatTime(flash.checked_in_at)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hairline my-6 opacity-30" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">Manual entry</div>
              <div className="flex gap-2">
                <input className="field flex-1 font-mono text-xs" placeholder="LUMEN2:… or LUMEN:…" value={manualCode} onChange={e => setManualCode(e.target.value)} />
                <button className="btn-gold px-4 py-2 rounded text-xs" onClick={() => { if (manualCode.trim()) { handleScan(manualCode.trim()); setManualCode(''); } }}>Verify</button>
              </div>
              <div className="text-[11px] text-[#8a8178] mt-2">Paste a ticket code if the camera can't read the QR.</div>
            </div>
          </div>

          <aside className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-4 flex items-center gap-2"><ScanLine className="w-3.5 h-3.5" /> Recent scans</div>
            {logs.length === 0 && <div className="text-sm text-[#8a8178] text-center py-14"><Users className="w-6 h-6 mx-auto mb-3 opacity-40" />Awaiting the first guest…</div>}
            <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
              {logs.map(l => (
                <div key={l.id} className="flex items-center justify-between gap-3 p-3 rounded border border-[#332e28]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full" style={{ background: l.result === 'valid' ? '#7d9b7f' : l.result === 'duplicate' ? '#d4a054' : '#c47865' }} />
                    <div className="min-w-0">
                      <div className="text-sm text-cream truncate">{l.guest_name || 'Unknown ticket'}</div>
                      <div className="text-[11px] text-[#8a8178]">{relativeTime(l.created_at)} · {formatTime(l.created_at)}</div>
                    </div>
                  </div>
                  <StatusBadge status={l.result} />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="px-4 py-2 rounded-lg border border-[#332e28] bg-[#141210]">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#8a8178]">{label}</div>
      <div className="font-display text-2xl" style={{ color }}>{value}</div>
    </div>
  );
}
