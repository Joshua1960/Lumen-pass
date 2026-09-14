import { useMemo, useState } from "react";
import { Download, FileDown, Loader2, Ticket as TicketIcon } from "lucide-react";
import QRDisplay from "./QRDisplay";
import type { EventRecord, Invitation } from "../lib/types";
import {
  formatDate,
  formatShortDate,
  formatTime,
  inviteLink,
} from "../lib/format";
import { downloadTicketImage, downloadTicketPdf, ticketPayload } from "../lib/ticket";

export default function TicketCard({
  invitation,
  event,
  compact = false,
}: {
  invitation: Invitation;
  event: EventRecord;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<"img" | "pdf" | null>(null);
  const [error, setError] = useState("");

  const guestLabel = useMemo(
    () => invitation.guest_name || "Guest",
    [invitation.guest_name],
  );
  const payload = useMemo(() => ticketPayload(invitation), [invitation]);

  const spec = useMemo(
    () => ({ invitation, event, guestLabel }),
    [invitation, event, guestLabel],
  );

  const exportImage = async () => {
    setBusy("img");
    setError("");
    try {
      await downloadTicketImage(spec);
    } catch {
      setError("Ticket image export failed. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy("pdf");
    setError("");
    try {
      await downloadTicketPdf(spec);
    } catch {
      setError("Ticket PDF export failed. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-ink text-cream border border-gold/25 card-glow">
      {/* Cover band */}
      <div className="relative h-36 sm:h-44 overflow-hidden">
        {event.cover_image && (
          <img
            src={event.cover_image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/15" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-1 flex items-center gap-1.5">
            <TicketIcon size={11} /> Lumen · Admit one
          </p>
          <h3 className="font-display text-2xl sm:text-3xl leading-tight">
            {event.title}
          </h3>
          <p className="text-xs text-cream/70 mt-1">For {guestLabel}</p>
        </div>
      </div>

      {/* Structural details */}
      <div className={`px-5 ${compact ? "pt-4" : "pt-5"} space-y-2 text-sm`}>
        <p className="flex justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gold-2 pt-0.5">Date</span>
          <span className="text-right text-cream/90">
            {formatDate(event.starts_at) || formatShortDate(event.starts_at) || "—"}
          </span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gold-2 pt-0.5">Time</span>
          <span className="text-right text-cream/90">
            {formatTime(event.starts_at)}
            {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}
          </span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gold-2 pt-0.5">Venue</span>
          <span className="text-right text-cream/90">{event.venue || "—"}</span>
        </p>
        {event.address && (
          <p className="flex justify-between gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gold-2 pt-0.5">Address</span>
            <span className="text-right text-cream/70 text-[13px]">{event.address}</span>
          </p>
        )}
        {invitation.plus_ones > 0 && (
          <p className="flex justify-between gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gold-2 pt-0.5">Party</span>
            <span className="text-right text-cream/90">+{invitation.plus_ones} accompanying</span>
          </p>
        )}
      </div>

      <div className="mx-5 my-4 hairline opacity-60" />

      {/* Centrally rendered, high-resolution QR */}
      <div className="px-5 pb-2">
        <div className="rounded-2xl bg-cream p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-ink/50 mb-3">
            Present at the door
          </p>
          <div className="flex justify-center">
            <QRDisplay value={payload || inviteLink(invitation.qr_token)} size={compact ? 180 : 220} />
          </div>
          <p className="mt-3 font-mono text-[11px] text-ink/50 break-all">
            {invitation.qr_token}
          </p>
        </div>
      </div>

      {/* Export actions */}
      <div className="px-5 pb-5 pt-2">
        {error && <p className="text-xs text-rose mb-2">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={exportImage}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-gold text-ink text-xs tracking-wide hover:bg-gold-2 disabled:opacity-60 transition-colors"
          >
            {busy === "img" ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {busy === "img" ? "Saving…" : "Save image"}
          </button>
          <button
            onClick={exportPdf}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-cream/25 text-cream text-xs tracking-wide hover:border-gold/60 hover:text-gold-2 disabled:opacity-60 transition-colors"
          >
            {busy === "pdf" ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
            {busy === "pdf" ? "Saving…" : "Save PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
