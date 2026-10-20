import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Zap, ZapOff, RefreshCw, AlertTriangle } from 'lucide-react';

interface CameraDevice { id: string; label: string }

export default function QRScanner({ onScan, paused = false }: { onScan: (raw: string) => void; paused?: boolean }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);
  const lastScanRef = useRef<{ text: string; time: number } | null>(null);

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [cameraId, setCameraId] = useState<string>('');
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState<string>('');
  const [ready, setReady] = useState(false);

  // Discover available cameras once at mount.
  useEffect(() => {
    let cancelled = false;
    Html5Qrcode.getCameras()
      .then(devs => {
        if (cancelled) return;
        const list = devs.map(d => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 4)}` }));
        setCameras(list);
        // Prefer a back/environment camera when present
        const back = list.find(d => /back|rear|environment/i.test(d.label));
        setCameraId(back?.id || list[0]?.id || '');
      })
      .catch(err => {
        console.error('camera enumeration failed', err);
        setError('Camera permission required. Enable camera access in your browser and reload.');
      });
    return () => { cancelled = true; };
  }, []);

  // Start / restart scanner whenever camera changes.
  useEffect(() => {
    if (!cameraId) return;
    let cancelled = false;

    const stopPrev = async () => {
      const s = scannerRef.current;
      if (s && scanningRef.current) {
        try { await s.stop(); } catch { /* ignore */ }
        try { await s.clear(); } catch { /* ignore */ }
        scanningRef.current = false;
      }
    };

    const start = async () => {
      await stopPrev();
      if (cancelled) return;
      setError('');
      setReady(false);
      const html5Qr = new Html5Qrcode('qr-reader', { verbose: false });
      scannerRef.current = html5Qr;
      try {
        await html5Qr.start(
          cameraId,
          { fps: 12, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
          (decoded) => {
            const now = Date.now();
            if (lastScanRef.current && lastScanRef.current.text === decoded && now - lastScanRef.current.time < 2500) return;
            lastScanRef.current = { text: decoded, time: now };
            onScan(decoded);
          },
          () => { /* per-frame scan errors are noisy; ignore */ },
        );
        scanningRef.current = true;
        setReady(true);
        // Detect torch capability
        try {
          const caps = (html5Qr as any).getRunningTrackCameraCapabilities?.();
          setTorchSupported(Boolean(caps?.torchFeature?.().isSupported?.()));
        } catch { setTorchSupported(false); }
      } catch (err: any) {
        console.error('camera start failed', err);
        setError(err?.message || 'Could not open the camera on this device.');
      }
    };

    start();

    return () => {
      cancelled = true;
      stopPrev();
    };
     
  }, [cameraId]);

  // Pause / resume when parent asks (e.g. while showing scan result)
  useEffect(() => {
    const s = scannerRef.current;
    if (!s || !scanningRef.current) return;
    try {
      if (paused) s.pause(true);
      else s.resume();
    } catch { /* noop */ }
  }, [paused]);

  // Torch toggle (best-effort; ignored on browsers without support)
  const toggleTorch = async () => {
    const s = scannerRef.current;
    if (!s || !scanningRef.current) return;
    try {
      const caps: any = (s as any).getRunningTrackCameraCapabilities?.();
      const feature = caps?.torchFeature?.();
      if (feature?.isSupported?.()) {
        await feature.apply(!torch);
        setTorch(!torch);
      }
    } catch (err) {
      console.warn('torch toggle failed', err);
    }
  };

  const retry = async () => {
    setError('');
    if (!cameraId && cameras[0]) setCameraId(cameras[0].id);
    else if (cameraId) {
      // Force restart by nudging state
      const id = cameraId;
      setCameraId('');
      setTimeout(() => setCameraId(id), 50);
    }
  };

  return (
    <div className="w-full">
      <div id="qr-reader" className="w-full mx-auto max-w-md rounded-lg overflow-hidden bg-black min-h-[280px] flex items-center justify-center">
        {!ready && !error && <div className="gold-ring" />}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-3 text-sm text-[#c47865] bg-[#c47865]/10 border border-[#c47865]/30 rounded p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div>{error}</div>
            <button onClick={retry} className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#c9a962] hover:text-[#e8d5a3]">
              <RefreshCw className="w-3 h-3" /> Try again
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Camera className="w-3.5 h-3.5 text-[#c9a962] flex-shrink-0" />
          {cameras.length > 0 ? (
            <select
              value={cameraId}
              onChange={e => setCameraId(e.target.value)}
              className="bg-[#141210] border border-[#332e28] text-cream text-xs rounded px-2 py-1.5 max-w-[220px]"
            >
              {cameras.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-[#8a8178]">Detecting cameras…</span>
          )}
        </div>
        {torchSupported && (
          <button onClick={toggleTorch} className="btn-ghost text-xs px-3 py-1.5 rounded inline-flex items-center gap-1.5">
            {torch ? <ZapOff className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
            {torch ? 'Torch off' : 'Torch on'}
          </button>
        )}
      </div>
    </div>
  );
}
