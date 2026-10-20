import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Copy, Check, Download } from "lucide-react";
import Navbar from "../components/Navbar";
import QRDisplay from "../components/QRDisplay";
import StatusBadge from "../components/StatusBadge";
import { api } from "../lib/api";
import { formatDate, formatTime } from "../lib/format";
import { qrFromToken } from "../lib/qr";
import jsPDF from "jspdf";
import type { Event } from "../lib/types";

interface GuestPassData {
  invitation: { guest_name: string; status: string };
  event: Event;
  ticket: {
    id: string;
    qr_token: string;
    checked_in_at: string | null;
  } | null;
}

export default function GuestPass() {
  const { token } = useParams();
  const [data, setData] = useState<GuestPassData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrImage, setQrImage] = useState("");
  const [pdfError, setPdfError] = useState("");

  const refresh = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      setData(await api.publicGuestPass(token));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load this pass.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (data?.invitation.status !== "requested") return;
    const interval = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(interval);
  }, [data?.invitation.status, refresh]);

  useEffect(() => {
    let active = true;
    setQrImage("");
    setPdfError("");
    if (data?.ticket?.qr_token) {
      qrFromToken(data.ticket.qr_token)
        .then((image) => {
          if (active) setQrImage(image);
        })
        .catch((cause: unknown) => {
          console.error("Guest pass QR generation failed", cause);
          if (active) setPdfError("Could not prepare the QR image. Reload this page and try again.");
        });
    }
    return () => {
      active = false;
    };
  }, [data?.ticket?.qr_token]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Unable to copy the pass link. You can still bookmark this page.");
    }
  };

  const downloadPass = () => {
    if (!data?.ticket || !qrImage) return;
    setPdfError("");
    try {
      const doc = new jsPDF({ unit: "pt", format: [400, 620] });
      doc.setFillColor(12, 11, 10);
      doc.rect(0, 0, 400, 620, "F");
      doc.setDrawColor(201, 169, 98);
      doc.setLineWidth(0.6);
      doc.rect(20, 20, 360, 580);

      doc.setTextColor(201, 169, 98);
      doc.setFontSize(10);
      doc.text("LUMEN · ADMIT ONE", 200, 50, { align: "center" });
      doc.setTextColor(243, 235, 224);
      doc.setFont("times", "italic");
      doc.setFontSize(22);
      doc.text(data.event.title, 200, 90, { align: "center", maxWidth: 320 });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(138, 129, 120);
      doc.text(
        `${formatDate(data.event.starts_at)} · ${formatTime(data.event.starts_at)}`,
        200,
        115,
        { align: "center" },
      );
      doc.text(data.event.venue, 200, 130, { align: "center", maxWidth: 320 });
      doc.addImage(qrImage, "PNG", 100, 160, 200, 200);
      doc.setDrawColor(51, 46, 40);
      doc.line(40, 400, 360, 400);
      doc.setTextColor(201, 169, 98);
      doc.setFontSize(8);
      doc.text("GUEST", 40, 425);
      doc.setTextColor(243, 235, 224);
      doc.setFontSize(13);
      doc.text(data.invitation.guest_name, 40, 445, { maxWidth: 320 });
      doc.setTextColor(201, 169, 98);
      doc.setFontSize(8);
      doc.text("PASS ID", 40, 480);
      doc.setTextColor(243, 235, 224);
      doc.setFontSize(10);
      doc.text(data.ticket.id.slice(0, 8).toUpperCase(), 40, 498);
      doc.setTextColor(138, 129, 120);
      doc.setFontSize(7);
      doc.text("Present this QR pass at the door for verification.", 200, 570, {
        align: "center",
        maxWidth: 320,
      });
      doc.save(`lumen-pass-${data.ticket.id.slice(0, 8)}.pdf`);
    } catch (cause) {
      console.error("Guest pass PDF generation failed", cause);
      setPdfError("Could not create the PDF. Try reloading the page.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#8a8178] hover:text-[#c9a962] mb-8"
        >
          <ArrowLeft className="w-3 h-3" /> Browse events
        </Link>
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="gold-ring" />
          </div>
        ) : error && !data ? (
          <div className="text-sm text-[#c47865] bg-[#c47865]/10 border border-[#c47865]/30 rounded px-4 py-3">
            {error}
          </div>
        ) : data ? (
          <section className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-8 text-center">
            <div className="corner-tl" />
            <div className="corner-tr" />
            <div className="corner-bl" />
            <div className="corner-br" />
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-3">
              Attendance request
            </div>
            <h1 className="font-display text-4xl text-cream mb-4">
              {data.event.title}
            </h1>
            <div className="flex flex-col items-center gap-2 text-sm text-[#8a8178] mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#c9a962]" />
                {formatDate(data.event.starts_at)} · {formatTime(data.event.starts_at)}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#c9a962]" />
                {data.event.venue}
              </div>
            </div>
            <div className="mb-6">
              <StatusBadge status={data.invitation.status} />
            </div>

            {data.ticket ? (
              <>
                <p className="text-sm text-[#8a8178] mb-5">
                  Approved for {data.invitation.guest_name}. Show this QR pass at the door.
                </p>
                <div className="inline-flex rounded-lg bg-[#f3ebe0] p-3">
                  <QRDisplay value={data.ticket.qr_token} size={240} />
                </div>
                <p className="font-mono text-xs text-[#8a8178] mt-4">
                  Pass #{data.ticket.id.slice(0, 8).toUpperCase()}
                </p>
                {pdfError && (
                  <p className="text-sm text-[#c47865] mt-3">{pdfError}</p>
                )}
                <button
                  type="button"
                  onClick={downloadPass}
                  disabled={!qrImage}
                  className="btn-gold px-5 py-2.5 rounded text-sm inline-flex items-center gap-2 mt-5 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {qrImage ? "Download pass PDF" : "Preparing pass…"}
                </button>
              </>
            ) : (
              <p className="text-sm text-[#8a8178] leading-relaxed max-w-md mx-auto">
                {data.invitation.status === "requested"
                  ? "Your request is with the organiser. Keep this private link; this page checks for a decision every 15 seconds. No account or email verification is needed."
                  : data.invitation.status === "declined"
                    ? "The organiser declined this request. Contact them directly if you have questions."
                    : "This request does not have an active pass."}
              </p>
            )}

            {error && (
              <div className="text-sm text-[#c47865] mt-5">{error}</div>
            )}
            <div className="flex justify-center gap-3 mt-7">
              <button
                type="button"
                onClick={copyLink}
                className="btn-ghost px-4 py-2 rounded text-sm inline-flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy private link"}
              </button>
              {!data.ticket && (
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="btn-gold px-4 py-2 rounded text-sm"
                >
                  Check status
                </button>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
