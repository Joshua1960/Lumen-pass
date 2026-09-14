import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  Keyboard,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  ShieldX,
  Ban,
  History,
  ScanLine,
  Wifi,
  WifiOff,
  CloudUpload,
} from "lucide-react";
import Navbar from "../components/Navbar";
import CapacityMeter from "../components/CapacityMeter";
import { apiFetch } from "../lib/api";
import {
  countQueued,
  clearQueued,
  listQueued,
  queueScan,
  idbAvailable,
} from "../lib/scanQueue";
import type { EventRecord, ScanResponse } from "../lib/types";

type Verdict =
  | "success"
  | "duplicate"
  | "invalid"
  | "declined"
  | "cancelled"
  | "override"
  | "undo";

interface ScanEntry {
  key: number;
  verdict: Verdict;
  guest: string;
  message: string;
  at: string;
  queued?: boolean;
}

const verdictMeta: Record<
  Verdict,
  { title: string; icon: typeof CheckCircle2; card: string; glow: string }
> = {
  success: {
    title: "Access Granted",
    icon: CheckCircle2,
    card: "border-sage/60 bg-sage/10 text-sage",
    glow: "shadow-[0_0_60px_-12px_rgba(125,155,127,0.55)]",
  },
  override: {
    title: "Access Granted",
    icon: CheckCircle2,
    card: "border-gold/60 bg-gold/10 text-gold-2",
    glow: "shadow-[0_0_60px_-12px_rgba(201,169,98,0.55)]",
  },
  duplicate: {
    title: "Warning",
    icon: AlertTriangle,
    card: "border-amber/60 bg-amber/10 text-amber",
    glow: "shadow-[0_0_60px_-12px_rgba(212,160,84,0.55)]",
  },
  invalid: {
    title: "Access Denied",
    icon: ShieldX,
    card: "border-rose/60 bg-rose/10 text-rose",
    glow: "shadow-[0_0_60px_-12px_rgba(196,120,101,0.55)]",
  },
  declined: {
    title: "Access Denied",
    icon: Ban,
    card: "border-rose/60 bg-rose/10 text-rose",
    glow: "shadow-[0_0_60px_-12px_rgba(196,120,101,0.55)]",
  },
  cancelled: {
    title: "Access Denied",
    icon: Ban,
    card: "border-rose/60 bg-rose/10 text-rose",
    glow: "shadow-[0_0_60px_-12px_rgba(196,120,101,0.55)]",
  },
  undo: {
    title: "Reversed",
    icon: History,
    card: "border-white/15 bg-white/5 text-muted",
    glow: "",
  },
};

function useDoorAudio(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const tone = useCallback(
    (
      freq: number,
      startAt: number,
      dur: number,
      type: OscillatorType = "sine",
      gain = 0.16,
    ) => {
      try {
        if (!enabledRef.current) return;
        const AC: typeof AudioContext | undefined =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AC) return;
        if (!ctxRef.current) ctxRef.current = new AC();
        const ctx = ctxRef.current;
        if (ctx.state === "suspended") void ctx.resume();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        const t = ctx.currentTime + startAt;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      } catch {
        /* audio unavailable — visual feedback still shows */
      }
    },
    [],
  );

  const play = useCallback(
    (verdict: Verdict) => {
      if (verdict === "success" || verdict === "override") {
        tone(660, 0, 0.16);
        tone(880, 0.14, 0.24);
      } else if (verdict === "duplicate") {
        tone(440, 0, 0.18, "triangle", 0.18);
        tone(440, 0.22, 0.18, "triangle", 0.18);
      } else if (verdict === "declined" || verdict === "cancelled") {
        tone(330, 0, 0.2, "sawtooth", 0.1);
        tone(220, 0.18, 0.3, "sawtooth", 0.1);
      } else {
        tone(180, 0, 0.35, "sawtooth", 0.12);
      }
      try {
        if (enabledRef.current && "vibrate" in navigator) {
          if (verdict === "success" || verdict === "override")
            navigator.vibrate?.(40);
          else if (verdict === "duplicate") navigator.vibrate?.([60, 60, 60]);
          else navigator.vibrate?.([120, 60, 120]);
        }
      } catch {
        /* noop */
      }
    },
    [tone],
  );

  useEffect(() => {
    return () => {
      try {
        void ctxRef.current?.close();
      } catch {
        /* noop */
      }
      ctxRef.current = null;
    };
  }, []);

  return play;
}

export default function Scanner() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const [checked, setChecked] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState("");
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem("lumen_door_sound") !== "off";
    } catch {
      return true;
    }
  });
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const [session, setSession] = useState({
    granted: 0,
    warnings: 0,
    denied: 0,
  });
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false,
  );
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastToken = useRef("");
  const lastAt = useRef(0);
  const playVerdict = useDoorAudio(soundOn);

  useEffect(() => {
    (async () => {
      try {
        const ev = await apiFetch<EventRecord>(`/api/events?id=${id}`);
        setEvent(ev);
        setChecked(ev.checked_in_count || 0);
        setCapacity(ev.capacity);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load event");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const toggleSound = () => {
    setSoundOn((v) => {
      try {
        localStorage.setItem("lumen_door_sound", v ? "off" : "on");
      } catch {
        /* noop */
      }
      return !v;
    });
  };

  const submit = useCallback(
    async (token: string) => {
      const trimmed = token.trim();
      if (!trimmed || !id) return;
      const now = Date.now();
      if (trimmed === lastToken.current && now - lastAt.current < 2500) return;
      lastToken.current = trimmed;
      lastAt.current = now;
      setBusy(true);
      setError("");
      const stamp = () =>
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        });
      const pushEntry = (
        verdict: Verdict,
        guest: string,
        message: string,
        queued = false,
      ) => {
        setHistory((h) =>
          [
            {
              key: Date.now() + Math.random(),
              verdict,
              guest,
              message,
              at: stamp(),
              queued,
            },
            ...h,
          ].slice(0, 20),
        );
        setSession((s) => ({
          granted:
            s.granted +
            (verdict === "success" || verdict === "override" ? 1 : 0),
          warnings: s.warnings + (verdict === "duplicate" ? 1 : 0),
          denied:
            s.denied +
            (verdict === "invalid" ||
            verdict === "declined" ||
            verdict === "cancelled"
              ? 1
              : 0),
        }));
      };
      // Offline fallback: no connection → stash the payload in IndexedDB and
      // confirm the capture locally; it syncs when the door comes back online.
      const offline =
        typeof navigator !== "undefined" && navigator.onLine === false;
      if (offline) {
        try {
          if (idbAvailable()) {
            await queueScan(Number(id), trimmed);
            setPending(await countQueued(Number(id)));
          }
          pushEntry(
            "success",
            "Captured offline",
            "Seal stored on this device — will sync when the connection returns.",
            true,
          );
          setManual("");
        } catch {
          setError(
            "Offline and local storage is unavailable. Reconnect, then scan again.",
          );
        } finally {
          setBusy(false);
        }
        return;
      }
      try {
        // 1. Parse the QR payload token, 2. dispatch auth request, 3. backend
        // checks: authentic? assigned to this event? already scanned?
        const data = await apiFetch<ScanResponse>("/api/scan", {
          method: "POST",
          body: JSON.stringify({ event_id: Number(id), token: trimmed }),
        });
        setResult(data);
        setResultKey((k) => k + 1);
        playVerdict(data.result as Verdict);
        // Live dashboard mutation: counts update instantly on every scan.
        if (typeof data.checked_in_count === "number")
          setChecked(data.checked_in_count);
        if (typeof data.capacity === "number") setCapacity(data.capacity);
        pushEntry(
          data.result as Verdict,
          data.guest_name || "Unknown seal",
          data.message,
        );
        setManual("");
      } catch (err: unknown) {
        // A failed request mid-drop is treated as offline: queue, don't lose.
        const msg = err instanceof Error ? err.message : "Scan failed";
        if (
          /failed to fetch|network|offline|load failed/i.test(msg) &&
          idbAvailable()
        ) {
          try {
            await queueScan(Number(id), trimmed);
            setPending(await countQueued(Number(id)));
            pushEntry(
              "success",
              "Captured offline",
              "Seal stored on this device — will sync when the connection returns.",
              true,
            );
            setManual("");
            setError("");
          } catch {
            setError(msg);
          } finally {
            setBusy(false);
          }
          return;
        }
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [id, playVerdict],
  );

  // Flush the IndexedDB queue to the server once connectivity returns.
  const syncQueue = useCallback(
    async (silent = false) => {
      if (!id || syncing) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false)
        return;
      let rows: { key: number; token: string }[] = [];
      try {
        rows = (await listQueued(Number(id))).map((r) => ({
          key: r.key,
          token: r.token,
        }));
      } catch {
        return;
      }
      if (!rows.length) {
        setPending(0);
        return;
      }
      setSyncing(true);
      if (!silent)
        setSyncMsg(
          `Syncing ${rows.length} stored scan${rows.length === 1 ? "" : "s"}…`,
        );
      try {
        const data = await apiFetch<{
          results: ScanResponse[];
          synced: number;
          total: number;
        }>("/api/scan/batch", {
          method: "POST",
          body: JSON.stringify({
            event_id: Number(id),
            tokens: rows.map((r) => r.token),
          }),
        });
        await clearQueued(rows.map((r) => r.key));
        const left = await countQueued(Number(id));
        setPending(left);
        if (typeof data.results !== "undefined") {
          const last = data.results[data.results.length - 1];
          if (last) {
            setResult(last);
            setResultKey((k) => k + 1);
            playVerdict(last.result as Verdict);
            if (typeof last.checked_in_count === "number")
              setChecked(last.checked_in_count);
            if (typeof last.capacity === "number") setCapacity(last.capacity);
          }
          setSession((s) => ({
            granted:
              s.granted +
              data.results.filter(
                (r) => r.result === "success" || r.result === "override",
              ).length,
            warnings:
              s.warnings +
              data.results.filter((r) => r.result === "duplicate").length,
            denied:
              s.denied +
              data.results.filter(
                (r) =>
                  r.result === "invalid" ||
                  r.result === "declined" ||
                  r.result === "cancelled",
              ).length,
          }));
        }
        setSyncMsg(
          `Synced ${data.synced ?? data.total ?? rows.length} stored check-in${(data.synced ?? rows.length) === 1 ? "" : "s"}.`,
        );
      } catch {
        if (!silent)
          setSyncMsg("Sync failed — stored scans are safe on this device.");
      } finally {
        setSyncing(false);
      }
    },
    [id, playVerdict, syncing],
  );

  useEffect(() => {
    const on = () => {
      setOnline(true);
      void syncQueue(true);
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [syncQueue]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setPending(await countQueued(Number(id)));
      } catch {
        /* noop */
      }
    })();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void syncQueue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startCam = async () => {
    setCamError("");
    try {
      const inst = new Html5Qrcode("lumen-qr-reader");
      scannerRef.current = inst;
      await inst.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded: string) => {
          submit(decoded);
        },
        () => {},
      );
      setCamOn(true);
    } catch {
      setCamError("Camera unavailable. Enter the seal manually.");
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

  const meta = result
    ? (verdictMeta[result.result as Verdict] ?? verdictMeta.invalid)
    : null;
  const MetaIcon = meta?.icon ?? ScanLine;

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="max-w-5xl mx-auto px-5 py-8">
        <Link
          to={`/events/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-cream mb-6"
        >
          <ArrowLeft size={14} /> Back to evening
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2 flex items-center gap-2">
              <span className="live-dot" /> The door · live verification
            </p>
            <h1 className="font-display text-4xl mb-1">
              {event?.title || "Scanner"}
            </h1>
            <p className="text-muted text-sm">
              Present the guest seal. The book records the result.
            </p>
          </div>
          <button
            onClick={toggleSound}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors ${
              soundOn
                ? "border-gold/40 text-gold-2 bg-gold/10"
                : "border-line text-muted hover:text-cream"
            }`}
            aria-pressed={soundOn}
            title="Toggle audio alerts"
          >
            {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
            {soundOn ? "Sound on" : "Sound off"}
          </button>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs ${
              online
                ? "border-sage/40 text-sage bg-sage/10"
                : "border-amber/50 text-amber bg-amber/10"
            }`}
            title={
              online
                ? "Connected — scans verify instantly"
                : "Offline — scans are stored on this device"
            }
          >
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {online ? "Online" : "Offline"}
          </span>
        </div>

        <div className="mt-6 mb-6">
          <CapacityMeter current={checked} capacity={capacity} />
          <p className="text-[11px] text-muted mt-1.5">
            Dashboard updates live on every scan · this shift: {session.granted}{" "}
            granted · {session.warnings} warnings · {session.denied} denied
          </p>
          {(pending > 0 || syncMsg) && (
            <div
              className={`mt-2 rounded-xl border px-3 py-2 text-xs flex items-center gap-2 ${pending > 0 ? "border-amber/50 bg-amber/10 text-amber" : "border-sage/40 bg-sage/10 text-sage"}`}
            >
              {syncing ? (
                <CloudUpload size={13} className="animate-pulse shrink-0" />
              ) : pending > 0 ? (
                <WifiOff size={13} className="shrink-0" />
              ) : (
                <Wifi size={13} className="shrink-0" />
              )}
              <span className="flex-1">
                {pending > 0
                  ? `${pending} scan${pending === 1 ? "" : "s"} stored offline${online ? " — syncing…" : " — will push when the connection returns"}.`
                  : syncMsg}
              </span>
              {pending > 0 && online && (
                <button
                  onClick={() => syncQueue()}
                  disabled={syncing}
                  className="shrink-0 px-3 py-1 rounded-full bg-amber text-ink text-[11px] disabled:opacity-60"
                >
                  {syncing ? "Syncing…" : "Sync now"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-5 items-start">
          {/* Camera module */}
          <section>
            <div className="rounded-2xl border border-line bg-card overflow-hidden mb-3">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-line/70">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted inline-flex items-center gap-1.5">
                  <Camera size={13} className="text-gold" /> Camera module
                </p>
                <button
                  onClick={() => (camOn ? stopCam() : startCam())}
                  className={`px-4 py-1.5 rounded-full text-xs transition-colors inline-flex items-center gap-1.5 ${
                    camOn
                      ? "border border-line text-muted hover:text-cream"
                      : "bg-gold text-ink hover:bg-gold-2"
                  }`}
                >
                  {camOn ? <CameraOff size={13} /> : <Camera size={13} />}
                  {camOn ? "Turn off" : "Turn on"}
                </button>
              </div>
              <div
                id="lumen-qr-reader"
                className={`bg-black ${camOn ? "min-h-[280px]" : "h-0 overflow-hidden"}`}
              />
              {!camOn && (
                <div className="p-10 text-center">
                  <Camera className="mx-auto text-gold mb-3" size={28} />
                  <p className="text-sm text-muted mb-4">
                    Toggle the camera to read a guest QR, or enter the token by
                    hand.
                  </p>
                  <button
                    onClick={startCam}
                    className="px-5 py-2 rounded-full bg-gold text-ink text-sm hover:bg-gold-2"
                  >
                    Start camera
                  </button>
                </div>
              )}
            </div>
            {camError && <p className="text-sm text-amber mb-4">{camError}</p>}

            <button
              onClick={() => setShowManual((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm text-gold-2 mb-3"
            >
              <Keyboard size={14} />{" "}
              {showManual ? "Hide manual entry" : "Enter token manually"}
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
                  Verify
                </button>
              </form>
            )}

            {error && <p className="text-sm text-rose mb-4">{error}</p>}

            {/* Verification history */}
            <div className="rounded-2xl border border-line bg-card p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted mb-3 inline-flex items-center gap-1.5">
                <History size={13} /> This shift
              </p>
              {history.length === 0 ? (
                <p className="text-sm text-muted">
                  No scans yet. The door is waiting.
                </p>
              ) : (
                <ol className="space-y-2 max-h-64 overflow-auto pr-1">
                  {history.map((h) => {
                    const m = verdictMeta[h.verdict] ?? verdictMeta.invalid;
                    const Icon = m.icon;
                    return (
                      <li
                        key={h.key}
                        className="flex items-start gap-2.5 rounded-xl border border-line/70 px-3 py-2"
                      >
                        <Icon size={15} className="mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm text-cream truncate">
                              {h.guest}
                              {h.queued && (
                                <span className="ml-1.5 text-[10px] text-amber uppercase tracking-wider">
                                  · queued
                                </span>
                              )}
                            </p>
                            <span className="text-[11px] text-muted shrink-0">
                              {h.at}
                            </span>
                          </div>
                          <p className="text-xs text-muted truncate">
                            {h.message}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
              <div className="flex gap-4 mt-3 pt-3 border-t border-line/70 text-center">
                <div className="flex-1">
                  <p className="font-display text-xl text-sage">
                    {session.granted}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-muted">
                    Granted
                  </p>
                </div>
                <div className="flex-1">
                  <p className="font-display text-xl text-amber">
                    {session.warnings}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-muted">
                    Warnings
                  </p>
                </div>
                <div className="flex-1">
                  <p className="font-display text-xl text-rose">
                    {session.denied}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-muted">
                    Denied
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Instant verdict */}
          <section className="lg:sticky lg:top-20">
            <AnimatePresence mode="wait">
              {result && meta ? (
                <motion.div
                  key={resultKey}
                  initial={{ opacity: 0, scale: 0.94, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -8 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className={`rounded-3xl border-2 p-7 sm:p-8 text-center ${meta.card} ${meta.glow}`}
                  role="alert"
                  aria-live="assertive"
                >
                  <motion.div
                    key={`icon-${resultKey}`}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 16,
                      delay: 0.05,
                    }}
                    className="flex justify-center mb-4"
                  >
                    <MetaIcon size={54} strokeWidth={1.75} />
                  </motion.div>
                  <p className="text-[11px] uppercase tracking-[0.32em] mb-2 opacity-80">
                    {result.result.replace("_", " ")} · verification
                  </p>
                  <p className="font-display text-4xl sm:text-5xl leading-tight mb-2">
                    {meta.title}
                  </p>
                  <p className="font-display text-2xl mb-2 opacity-95">
                    {result.result === "invalid"
                      ? "Unknown ticket"
                      : result.guest_name
                        ? result.result === "success" ||
                          result.result === "override"
                          ? `Welcome ${result.guest_name}`
                          : result.guest_name
                        : "Unknown seal"}
                  </p>
                  <p className="text-sm opacity-80 max-w-sm mx-auto">
                    {result.message}
                  </p>
                  {result.plus_ones > 0 &&
                    (result.result === "success" ||
                      result.result === "override") && (
                      <p className="text-sm mt-3 font-medium">
                        Plus {result.plus_ones} accompanying
                      </p>
                    )}
                  {result.checked_in_at && result.result === "duplicate" && (
                    <p className="text-xs mt-3 opacity-70">
                      First admitted{" "}
                      {new Date(result.checked_in_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-xs opacity-70">
                    <span className="live-dot" />
                    Door book updated · {checked}/{capacity} inside
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-3xl border border-dashed border-line bg-card p-10 text-center"
                >
                  <ScanLine size={32} className="mx-auto text-gold mb-4" />
                  <p className="font-display text-2xl text-cream mb-2">
                    Ready to verify
                  </p>
                  <p className="text-sm text-muted max-w-xs mx-auto">
                    Scan a QR to authenticate it instantly — genuine, assigned,
                    and unused.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap gap-2 mt-4">
              <Link
                to={`/events/${id}/attendance`}
                className="flex-1 text-center px-4 py-2.5 rounded-full border border-line text-sm text-cream hover:border-gold/40"
              >
                Open live attendance
              </Link>
              <Link
                to="/dashboard"
                className="flex-1 text-center px-4 py-2.5 rounded-full border border-line text-sm text-muted hover:text-cream"
              >
                Host dashboard
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
