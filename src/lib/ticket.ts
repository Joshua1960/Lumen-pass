import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import type { EventRecord, Invitation } from "./types";
import { formatDate, formatShortDate, formatTime, inviteLink } from "./format";

export interface TicketSpec {
  invitation: Invitation;
  event: EventRecord;
  guestLabel: string;
}

/** High-resolution QR payload: the full invite URL sealing this pairing. */
export function ticketPayload(inv: Invitation): string {
  return inviteLink(inv.qr_token);
}

async function qrDataUrl(payload: string, width = 1024): Promise<string> {
  return QRCode.toDataURL(payload, {
    width,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#0c0b0a", light: "#f3ebe0" },
  });
}

function safeName(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "lumen-ticket"
  );
}

function drawTicket(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  spec: TicketSpec,
  qr: HTMLImageElement,
  cover: HTMLImageElement | null,
) {
  const { invitation: inv, event: ev, guestLabel } = spec;
  const gold = "#c9a962";
  const gold2 = "#e8d5a3";
  const cream = "#f3ebe0";
  const muted = "#a89e91";
  const ink = "#0c0b0a";

  // Backdrop
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, W, H);

  // Cover band (top ~34%)
  const bandH = Math.round(H * 0.34);
  if (cover) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    // cover-fit
    const cr = cover.width / cover.height;
    const br = W / bandH;
    let dw = W;
    let dh = bandH;
    if (cr > br) {
      dh = bandH;
      dw = bandH * cr;
    } else {
      dw = W;
      dh = W / cr;
    }
    ctx.drawImage(cover, (W - dw) / 2, (bandH - dh) / 2, dw, dh);
    ctx.restore();
    const grad = ctx.createLinearGradient(0, 0, 0, bandH + 40);
    grad.addColorStop(0, "rgba(12,11,10,0.15)");
    grad.addColorStop(0.55, "rgba(12,11,10,0.45)");
    grad.addColorStop(1, "rgba(12,11,10,1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, bandH + 40);
  } else {
    const grad = ctx.createLinearGradient(0, 0, W, bandH);
    grad.addColorStop(0, "#241f18");
    grad.addColorStop(1, ink);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, bandH);
  }

  const pad = 72;
  let y = 88;

  // Eyebrow
  ctx.fillStyle = gold;
  ctx.font = "600 26px Outfit, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("L U M E N   ·   A D M I T   O N E", pad, y);
  y += 12;

  // Brand mark text
  ctx.fillStyle = cream;
  ctx.font = "600 88px Georgia, serif";
  const title = ev.title || "Evening";
  // Wrap title to two lines max
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > W - pad * 2 && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === 2) break;
    } else cur = test;
  }
  if (cur && lines.length < 2) lines.push(cur);
  y += 92;
  for (const ln of lines.slice(0, 2)) {
    ctx.fillText(ln, pad, y);
    y += 96;
  }

  y += 8;
  ctx.fillStyle = muted;
  ctx.font = "400 30px Outfit, sans-serif";
  ctx.fillText(`For ${guestLabel}`, pad, y);
  y += 52;

  // Gold hairline
  const hair = ctx.createLinearGradient(pad, 0, W - pad, 0);
  hair.addColorStop(0, "rgba(201,169,98,0)");
  hair.addColorStop(0.5, gold);
  hair.addColorStop(1, "rgba(201,169,98,0)");
  ctx.fillStyle = hair;
  ctx.fillRect(pad, y, W - pad * 2, 2);
  y += 52;

  // Structural details
  ctx.font = "600 24px Outfit, sans-serif";
  ctx.fillStyle = gold2;
  const rows: Array<[string, string]> = [
    ["DATE", formatDate(ev.starts_at) || formatShortDate(ev.starts_at)],
    ["TIME", `${formatTime(ev.starts_at)} – ${formatTime(ev.ends_at)}`.trim()],
    ["VENUE", ev.venue || "—"],
    ["ADDRESS", ev.address || "—"],
  ];
  if (ev.dress_code) rows.push(["DRESS", ev.dress_code]);
  if (inv.plus_ones > 0)
    rows.push(["PARTY", `${guestLabel} + ${inv.plus_ones}`]);
  for (const [k, v] of rows) {
    ctx.fillStyle = gold2;
    ctx.fillText(k, pad, y);
    ctx.fillStyle = cream;
    ctx.font = "400 30px Outfit, sans-serif";
    // Truncate to fit
    let val = v || "—";
    while (ctx.measureText(val).width > W - pad * 2 - 220 && val.length > 8) {
      val = val.slice(0, -2);
    }
    if (val !== v) val += "…";
    ctx.fillText(val, pad + 220, y);
    ctx.font = "600 24px Outfit, sans-serif";
    y += 52;
  }

  y += 28;
  // QR card — centrally rendered, high-resolution
  const cardX = pad;
  const cardW = W - pad * 2;
  const qrSize = 560;
  const cardH = qrSize + 190;
  const cardY = y;
  ctx.fillStyle = "#f3ebe0";
  ctx.save();
  ctx.shadowColor = "rgba(201,169,98,0.35)";
  ctx.shadowBlur = 60;
  roundRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(12,11,10,0.55)";
  ctx.font = "600 24px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("P R E S E N T   A T   T H E   D O O R", W / 2, cardY + 58);
  ctx.textAlign = "left";

  const qx = (W - qrSize) / 2;
  ctx.drawImage(qr, qx, cardY + 84, qrSize, qrSize);

  ctx.fillStyle = "rgba(12,11,10,0.5)";
  ctx.font = "400 22px 'Courier New', monospace";
  ctx.textAlign = "center";
  const token = inv.qr_token || "";
  const shown = token.length > 34 ? token.slice(0, 34) + "…" : token;
  ctx.fillText(shown, W / 2, cardY + cardH - 34);
  ctx.textAlign = "left";

  // Footer
  ctx.fillStyle = muted;
  ctx.font = "400 24px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("The door remembers. The evening proceeds.", W / 2, H - 56);
  ctx.textAlign = "left";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src || src.startsWith("data:")) {
      // data-URL covers still load fine; only skip empties
      if (!src) return resolve(null);
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function renderTicketCanvas(
  spec: TicketSpec,
): Promise<HTMLCanvasElement> {
  const W = 1200;
  const H = 1900;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const [qrUrl, cover] = await Promise.all([
    qrDataUrl(ticketPayload(spec.invitation), 1024),
    loadImage(spec.event.cover_image),
  ]);
  const qr = await loadImage(qrUrl);
  if (!qr) throw new Error("QR render failed");
  drawTicket(ctx, W, H, spec, qr, cover);
  return canvas;
}

/** Download the ticket pass as a compressed image (JPEG). */
export async function downloadTicketImage(spec: TicketSpec): Promise<void> {
  const canvas = await renderTicketCanvas(spec);
  const url = canvas.toDataURL("image/jpeg", 0.92);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName(spec.event.title)}-ticket.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Download the ticket pass as a PDF (single page, ticket artwork). */
export async function downloadTicketPdf(spec: TicketSpec): Promise<void> {
  const canvas = await renderTicketCanvas(spec);
  const img = canvas.toDataURL("image/jpeg", 0.92);
  // Ticket aspect 1200x1900 → portrait PDF
  const pdf = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const iw = pw - margin * 2;
  const ih = (iw * canvas.height) / canvas.width;
  const y = Math.max(margin, (ph - ih) / 2 - 4);
  // Dark page backdrop to match the brand
  pdf.setFillColor(12, 11, 10);
  pdf.rect(0, 0, pw, ph, "F");
  pdf.addImage(img, "JPEG", margin, y, iw, Math.min(ih, ph - margin * 2));
  pdf.save(`${safeName(spec.event.title)}-ticket.pdf`);
}
