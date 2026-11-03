// Thin wrapper around OpenStreetMap's Nominatim search API, respecting its usage policy:
// https://operations.osmfoundation.org/policies/nominatim/ — no more than one request per
// second, and callers should identify themselves (the browser's own Referer header does this
// for a client-side app like this one; no API key is required for this volume of use).

export interface NominatimResult {
  displayName: string;
  lat: number;
  lng: number;
}

let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1100;

export async function searchAddress(query: string, signal?: AbortSignal): Promise<NominatimResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '6');

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) throw new Error('Address search failed. Try again in a moment.');
  const data: Array<{ display_name: string; lat: string; lon: string }> = await response.json();
  return data.map((r) => ({ displayName: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }));
}
