import { buildShortAddress } from './overpass';

export interface ResolvedLocation {
  lat: number;
  lon: number;
  name: string;
  /** 'gps' = browser geolocation, 'ip' = IP-based estimate, 'default' = last-resort Houston */
  source: 'gps' | 'ip' | 'default';
}

// Last-resort default when both browser geolocation and IP lookup fail.
const HOUSTON: ResolvedLocation = { lat: 29.7604, lon: -95.3698, name: 'Houston, TX', source: 'default' };

// Reverse geocode coordinates into a short, human-readable address.
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`);
    const data = await res.json();
    const a = data.address || {};
    return (
      buildShortAddress({
        houseNumber: a.house_number,
        street: a.road,
        city: a.city || a.town || a.village || a.county,
        state: a.state,
        postcode: a.postcode,
      }) ||
      data.display_name ||
      'Location Found'
    );
  } catch {
    return 'Location Found';
  }
}

// Approximate the user's location from their IP. No browser permission needed,
// so this is a good fallback when geolocation is slow, blocked, or unavailable.
async function ipLocate(): Promise<ResolvedLocation | null> {
  try {
    const res = await fetch('https://ipwho.is/');
    const d = await res.json();
    if (d && d.success !== false && typeof d.latitude === 'number' && typeof d.longitude === 'number') {
      const name =
        buildShortAddress({ city: d.city, state: d.region, postcode: d.postal }) ||
        [d.city, d.region, d.country].filter(Boolean).join(', ') ||
        'Approximate Location';
      return { lat: d.latitude, lon: d.longitude, name, source: 'ip' };
    }
  } catch {
    /* ignore and fall through */
  }
  return null;
}

// Try browser geolocation once with city-level accuracy; resolve null on any error.
function tryBrowserGeolocation(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      // City-level accuracy is enough for a gas finder and far more reliable on
      // desktop than high-accuracy fixes, which often time out.
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

/**
 * Resolve the user's location with graceful degradation:
 *   1. Browser geolocation (precise, needs permission)
 *   2. IP-based estimate (approximate, no permission) — covers denied/slow/blocked
 *   3. Houston default (only if everything above fails)
 */
export async function resolveUserLocation(): Promise<ResolvedLocation> {
  const pos = await tryBrowserGeolocation();
  if (pos) {
    const name = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    return { lat: pos.coords.latitude, lon: pos.coords.longitude, name, source: 'gps' };
  }
  return (await ipLocate()) || HOUSTON;
}
