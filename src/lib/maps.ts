export function mapsQuery(venue?: string, address?: string) {
  return [venue, address].filter(Boolean).join(', ').trim();
}

export function mapsEmbedUrl(query: string) {
  const q = query.trim();
  if (!q) return '';
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&hl=en&z=15&output=embed`;
}

export function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
