import crypto from 'crypto';

function signingSecret() {
  const secret = process.env.QR_SIGNING_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('QR_SIGNING_SECRET must be configured with at least 32 bytes of secret material');
  }
  return secret;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function b64urlDecode(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  return Buffer.from(s + '='.repeat(pad), 'base64');
}

// Sign a ticket payload (server-only). Signed QR string is safe to render on the client.
export function signTicket({ t, e, s }) {
  const payload = { t, e, s, iat: Date.now() };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', signingSecret()).update(body).digest();
  const sigStr = b64url(sig).slice(0, 24);
  return `LUMEN2:${body}.${sigStr}`;
}

// Verify a scanned raw string. Accepts LUMEN2:signed and legacy LUMEN: unsigned.
// Returns { t, e, s, legacy, iat } or null.
export function verifyTicket(raw) {
  if (typeof raw !== 'string') return null;

  if (raw.startsWith('LUMEN2:')) {
    const rest = raw.slice('LUMEN2:'.length);
    const dot = rest.indexOf('.');
    if (dot < 0) return null;
    const body = rest.slice(0, dot);
    const sig = rest.slice(dot + 1);
    const expected = b64url(
      crypto.createHmac('sha256', signingSecret()).update(body).digest(),
    ).slice(0, 24);
    if (sig.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff !== 0) return null;
    try {
      const obj = JSON.parse(b64urlDecode(body).toString('utf-8'));
      if (obj?.t && obj?.e && obj?.s) return { ...obj, legacy: false };
      return null;
    } catch { return null; }
  }

  if (raw.startsWith('LUMEN:')) {
    try {
      const obj = JSON.parse(Buffer.from(raw.slice(6), 'base64').toString('utf-8'));
      if (obj?.t && obj?.e && obj?.s) return { ...obj, legacy: true };
    } catch { return null; }
    return null;
  }

  return null;
}

// Convenience helper for ticket rows -> signed token to embed in QR
export function ticketToken(ticket) {
  return signTicket({ t: ticket.id, e: ticket.event_id, s: ticket.qr_secret });
}
