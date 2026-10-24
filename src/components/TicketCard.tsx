import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { formatDate, formatTime } from "../lib/format";
import { qrFromToken } from "../lib/qr";
import type { Ticket } from "../lib/types";
import jsPDF from "jspdf";

interface Props {
  ticket: Ticket & { qr_token?: string };
  guestName?: string;
  guestEmail?: string;
}

export default function TicketCard({ ticket, guestName, guestEmail }: Props) {
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token =
      ticket.qr_token ||
      `LUMEN:${btoa(JSON.stringify({ t: ticket.id, e: ticket.event_id, s: ticket.qr_secret }))}`;
    qrFromToken(token)
      .then(setQr)
      .catch((err) => console.error("QR render failed", err));
  }, [ticket.id, ticket.event_id, ticket.qr_secret, ticket.qr_token]);

  const downloadPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: [400, 620] });
    const gold = "#c9a962";
    doc.setFillColor(12, 11, 10);
    doc.rect(0, 0, 400, 620, "F");
    doc.setDrawColor(gold);
    doc.setLineWidth(0.6);
    doc.rect(20, 20, 360, 580);

    doc.setTextColor(gold);
    doc.setFontSize(10);
    doc.text("LUMEN · ADMIT ONE", 200, 50, { align: "center" });

    doc.setTextColor(243, 235, 224);
    doc.setFontSize(22);
    doc.setFont("times", "italic");
    const title = ticket.event?.title || "Event";
    doc.text(title, 200, 90, { align: "center", maxWidth: 320 });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(138, 129, 120);
    doc.text(
      formatDate(ticket.event?.starts_at) +
        " · " +
        formatTime(ticket.event?.starts_at),
      200,
      115,
      { align: "center" },
    );
    doc.text(ticket.event?.venue || "", 200, 130, {
      align: "center",
      maxWidth: 320,
    });

    if (qr) doc.addImage(qr, "PNG", 100, 160, 200, 200);

    doc.setDrawColor(51, 46, 40);
    doc.line(40, 400, 360, 400);

    doc.setTextColor(201, 169, 98);
    doc.setFontSize(8);
    doc.text("GUEST", 40, 425);
    doc.setTextColor(243, 235, 224);
    doc.setFontSize(13);
    doc.text(guestName || "Guest", 40, 445);

    doc.setTextColor(201, 169, 98);
    doc.setFontSize(8);
    doc.text("TICKET ID", 40, 480);
    doc.setTextColor(243, 235, 224);
    doc.setFontSize(10);
    doc.text(ticket.id.slice(0, 8).toUpperCase(), 40, 498);

    doc.setTextColor(138, 129, 120);
    doc.setFontSize(7);
    doc.text(
      "Present this ticket at the door for verification. Non-transferrable.",
      200,
      570,
      { align: "center", maxWidth: 320 },
    );

    doc.save(`lumen-ticket-${ticket.id.slice(0, 8)}.pdf`);
  };

  const emailTicket = () => {
    const to = guestEmail || "";
    const subject = `Your Lumen pass — ${ticket.event?.title || "Event"}`;
    const body = [
      `${guestName || "Guest"},`,
      "",
      `Your ticket for ${ticket.event?.title || "the event"} is confirmed.`,
      "",
      `When: ${formatDate(ticket.event?.starts_at)} at ${formatTime(ticket.event?.starts_at)}`,
      `Where: ${ticket.event?.venue || ""}`,
      "",
      `Ticket ID: ${ticket.id.slice(0, 8).toUpperCase()}`,
      "",
      `View your pass: ${window.location.origin}/my-tickets`,
      "",
      "Please present this pass at the door for scanning.",
    ].join("\n");
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const copyTicketId = async () => {
    try {
      await navigator.clipboard.writeText(ticket.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative bg-[#211d19] rounded-xl border border-[#332e28] card-glow overflow-hidden">
      <div className="corner-tl" />
      <div className="corner-tr" />
      <div className="corner-bl" />
      <div className="corner-br" />

      <div className="p-6 pb-4 text-center">
        <div className="text-[10px] uppercase tracking-[0.35em] text-[#c9a962] mb-1">
          Lumen · Admit One
        </div>
        <h3 className="font-display text-2xl text-cream mt-2">
          {ticket.event?.title}
        </h3>
        <div className="text-sm text-[#8a8178] mt-1">
          {formatDate(ticket.event?.starts_at)} ·{" "}
          {formatTime(ticket.event?.starts_at)}
        </div>
        <div className="text-sm text-[#8a8178]">{ticket.event?.venue}</div>
      </div>

      <div className="flex justify-center px-6">
        {qr ? (
          <div className="qr-frame">
            <img src={qr} alt="QR Ticket" className="w-52 h-52 block" />
          </div>
        ) : (
          <div className="w-52 h-52 bg-[#f3ebe0]/10 rounded flex items-center justify-center">
            <div className="gold-ring" />
          </div>
        )}
      </div>

      <div className="p-6 pt-4">
        {ticket.checked_in_at && (
          <div className="mt-4 mb-2 flex items-center justify-center gap-2 text-[#7d9b7f] text-sm">
            Checked in · {formatTime(ticket.checked_in_at)}
          </div>
        )}

        <div className="hairline my-4 opacity-40" />

        <div className="grid grid-cols-2 gap-4 text-xs mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#c9a962] mb-1">
              Guest
            </div>
            <div className="text-cream flex items-center gap-1.5">
              {guestName || "Guest"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#c9a962] mb-1">
              Ticket
            </div>
            <button
              onClick={copyTicketId}
              className="text-cream font-mono flex items-center gap-1 hover:text-[#c9a962]"
              title="Copy ticket id"
            >
              #{ticket.id.slice(0, 8).toUpperCase()}
              {copied ? (
                <Check className="w-3 h-3 text-[#7d9b7f]" />
              ) : (
                <Copy className="w-3 h-3 opacity-60" />
              )}
            </button>
          </div>
          <div className="col-span-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#c9a962] mb-1 flex items-center gap-1.5">
              Venue
            </div>
            <div className="text-cream">{ticket.event?.venue}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={downloadPDF}
            className="btn-ghost py-2.5 rounded flex items-center justify-center gap-2 text-xs"
          >
            PDF
          </button>
          <button
            onClick={emailTicket}
            className="btn-ghost py-2.5 rounded flex items-center justify-center gap-2 text-xs"
            title="Compose email with your pass"
          >
            Email
          </button>
        </div>
      </div>
    </div>
  );
}
