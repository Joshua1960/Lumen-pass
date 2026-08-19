import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRDisplay({
  value,
  size = 220,
  light = '#f3ebe0',
  dark = '#0c0b0a',
  className = '',
}: {
  value: string;
  size?: number;
  light?: string;
  dark?: string;
  className?: string;
}) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark, light },
      errorCorrectionLevel: 'H',
    }).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [value, size, light, dark]);

  if (!src) {
    return <div className={`bg-cream/10 animate-pulse ${className}`} style={{ width: size, height: size }} />;
  }

  return <img src={src} alt="Invitation QR code" width={size} height={size} className={className} />;
}
