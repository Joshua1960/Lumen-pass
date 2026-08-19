import { ExternalLink } from 'lucide-react';
import { mapsEmbedUrl, mapsQuery, mapsSearchUrl } from '../lib/maps';

export default function VenueMap({
  venue,
  address,
  height = 220,
  className = '',
}: {
  venue?: string;
  address?: string;
  height?: number;
  className?: string;
}) {
  const query = mapsQuery(venue, address);
  if (!query) {
    return (
      <div className={`rounded-2xl border border-dashed border-line bg-card flex items-center justify-center text-sm text-muted ${className}`} style={{ height }}>
        Add a venue or street address to pin the map.
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden border border-line bg-card ${className}`}>
      <iframe
        title={`Map of ${query}`}
        src={mapsEmbedUrl(query)}
        width="100%"
        height={height}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block w-full border-0 grayscale-[20%] contrast-[1.05]"
      />
      <div className="px-3 py-2 flex items-center justify-between gap-2 text-xs text-muted bg-ink-2">
        <span className="truncate">{query}</span>
        <a
          href={mapsSearchUrl(query)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-gold-2 shrink-0 hover:underline"
        >
          Open Maps <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
