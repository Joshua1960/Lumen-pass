import QRCode from 'qrcode';

// Signed tokens now come from the server (api/_qr.js). The client renders
// the token string into a QR image without needing the signing secret.
export async function qrFromToken(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 480,
    color: { dark: '#0c0b0a', light: '#f3ebe0' },
  });
}

// Local decode is only used to preview/detect the ticket format offline.
// Server ALWAYS re-verifies signatures before check-in.
export function localPreview(raw: string): { t?: string; e?: string; format: 'v2' | 'v1' | 'unknown' } {
  if (typeof raw !== 'string') return { format: 'unknown' };
  if (raw.startsWith('LUMEN2:')) {
    try {
      const rest = raw.slice('LUMEN2:'.length);
      const body = rest.split('.')[0];
      const s = body.replace(/-/g, '+').replace(/_/g, '/');
      const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
      const json = atob(s + '='.repeat(pad));
      const obj = JSON.parse(json);
      return { t: obj.t, e: obj.e, format: 'v2' };
    } catch { return { format: 'v2' }; }
  }
  if (raw.startsWith('LUMEN:')) {
    try {
      const obj = JSON.parse(atob(raw.slice(6)));
      return { t: obj.t, e: obj.e, format: 'v1' };
    } catch { return { format: 'v1' }; }
  }
  return { format: 'unknown' };
}
