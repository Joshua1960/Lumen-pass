import { useEffect } from "react";

/**
 * Real-time data stream for the organizer's dashboard.
 * The local API layer (`persist()` in lib/api) bumps a version key on every
 * mutation (scan, RSVP, CRUD). This hook re-runs `onPulse` instantly —
 * same-tab via CustomEvent, cross-tab via the storage event — so counts,
 * feeds and lists update without a page refresh and without polling churn.
 */
export function useLiveStream(onPulse: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let timer: number | null = null;
    const pulse = () => {
      if (timer !== null) return; // coalesce bursts (e.g. batch sync)
      timer = window.setTimeout(() => {
        timer = null;
        onPulse();
      }, 250);
    };
    const onCustom = () => pulse();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lumen_stream_v1") pulse();
    };
    const onFocus = () => pulse();
    window.addEventListener("lumen:stream", onCustom);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("lumen:stream", onCustom);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [onPulse, enabled]);
}
