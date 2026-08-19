import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, Keyboard, Camera } from 'lucide-react';
import Navbar from '../components/Navbar';
import CapacityMeter from '../components/CapacityMeter';
import { apiFetch } from '../lib/api';
import type { EventRecord, ScanResponse } from '../lib/types';

const tone: Record<string, string> = {
  success: 'border-sage/50 bg-sage/10 text-sage',
  override: 'border-gold/50 bg-gold/10 text-gold-2',
  duplicate: 'border-amber/50 bg-amber/10 text-amber',
  invalid: 'border-rose/50 bg-rose/10 text-rose',
  declined: 'border-rose/50 bg-rose/10 text-rose',
  cancelled: 'border-rose/50 bg-rose/10 text-rose',
  undo: 'border-white/15 bg-white/5 text-muted',
};

export default function Scanner() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [checked, setChecked] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastToken = useRef('');
  const lastAt = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const ev = await apiFetch<EventRecord>(`/api/events?id=${id}`);
        setEvent(ev);
        setChecked(ev.checked_in_count || 0);
        setCapacity(ev.capacity);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load event');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const submit = useCallback(
    async (token: string) => {
      const trimmed = token.trim();
      if (!trimmed || !id) return;
      const now = Date.now();
      if (trimmed === lastToken.current && now - lastAt.current < 2500) return;
      lastToken.current = trimmed;
      lastAt.current = now;
      setBusy(true);
      setError('');
      try {
        const data = await apiFetch<ScanResponse>('/api/scan', {
          method: 'POST',
          body: JSON.stringify({ event_id: Number(id), token: trimmed }),
        });
        setResult(data);
        if (typeof data.checked_in_count === 'number') setChecked(data.checked_in_count);
        if (typeof data.capacity === 'number') setCapacity(data.capacity);
        setManual('');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Scan failed');
      } finally {
        setBusy(false);
      }
    },
    [id]
  );

  const startCam = async () => {
    setCamError('');
    try {
      const inst = new Html5Qrcode('lumen-qr-reader');
      scannerRef.current = inst;
      await inst.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded: string) => {
          submit(decoded);
        },
        () => {}
      );
      setCamOn(true);
    } catch {
      setCamError('Camera unavailable. Enter the seal manually.');
      setShowManual(true);
    }
  };

  const stopCam = async () => {
    const inst = scannerRef.current;
    scannerRef.current = null;
    if (inst) {
      try {
        await inst.stop();
        inst.clear();
      } catch {
        /* ignore */
      }
    }
    setCamOn(false);
  };

  useEffect(() => {
    return () => {
      const inst = scannerRef.current;
      if (inst) {
        inst.stop().catch(() => {});
        inst.clear();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink">
        <Navbar />
        <div className="flex justify-center py-24">
          <div className="gold-ring" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="max-w-xl mx-auto px-5 py-8">
        <Link to={`/events/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-cream mb-6">
          <ArrowLeft size={14} /> Back to evening
        </Link>
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">The door</p>
        <h1 className="font-display text-4xl mb-1">{event?.title || 'Scanner'}</h1>
        <p className="text-muted text-sm mb-6">Present the guest seal. The book records the result.</p>

        <div className="mb-6">
          <CapacityMeter current={checked} capacity={capacity} />
        </div>

        <div className="rounded-2xl border border-line bg-card overflow-hidden mb-5">
          <div id="lumen-qr-reader" className={`bg-black ${camOn ? 'min-h-[280px]' : 'h-0 overflow-hidden'}`} />
          {!camOn && (
            <div className="p-10 text-center">
              <Camera className="mx-auto text-gold mb-3" size={28} />
              <p className="text-sm text-muted mb-4">Use the camera to read a guest QR, or enter the token by hand.</p>
              <button onClick={startCam} className="px-5 py-2 rounded-full bg-gold text-ink text-sm">
                Start camera
              </button>
            </div>
          )}
        </div>

        {camOn && (
          <button onClick={stopCam} className="mb-5 text-xs text-muted hover:text-cream">
            Stop camera
          </button>
        )}
        {camError && <p className="text-sm text-amber mb-4">{camError}</p>}

        <button
          onClick={() => setShowManual((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm text-gold-2 mb-3"
        >
          <Keyboard size={14} /> {showManual ? 'Hide manual entry' : 'Enter token manually'}
        </button>

        {showManual && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(manual);
            }}
            className="flex gap-2 mb-5"
          >
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Paste invite URL or token"
              className="flex-1 bg-card border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold/50"
            />
            <button
              type="submit"
              disabled={busy || !manual.trim()}
              className="px-4 rounded-xl bg-gold text-ink text-sm disabled:opacity-50"
            >
              Admit
            </button>
          </form>
        )}

        {error && <p className="text-sm text-rose mb-4">{error}</p>}

        {result && (
          <div className={`rounded-2xl border p-6 ${tone[result.result] || tone.invalid}`}>
            <p className="text-[10px] uppercase tracking-[0.28em] mb-2">{result.result.replace('_', ' ')}</p>
            <p className="font-display text-3xl mb-1">{result.guest_name || 'Unknown seal'}</p>
            <p className="text-sm opacity-80">{result.message}</p>
            {result.plus_ones > 0 && result.result === 'success' && (
              <p className="text-sm mt-2">Plus ones: {result.plus_ones}</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
