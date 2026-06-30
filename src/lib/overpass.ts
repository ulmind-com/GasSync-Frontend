import axios from 'axios';
import { api } from './axios';
import { getStationImageUrl } from './brandLogos';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCe6KCXl5MO1INT16N9I_kiMwXxwZHJc8o';
const PLACES_BASE = '/maps-api/place';

export interface GasStationPlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address: string;
  rating: number;
  totalRatings: number;
  isOpen: boolean | null;
  photoRef: string | null;
  types?: string[];
}

// ─── Short Address Formatter ───
// Builds "building street, city, state, pin" — drops country / extra parts.
export function buildShortAddress(parts: {
  houseNumber?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
}): string {
  const line1 = [parts.houseNumber, parts.street].filter(Boolean).join(' ').trim();
  return [line1, parts.city, parts.state, parts.postcode]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(', ');
}

// ─── Haversine Distance Calculator (miles) ───
export function calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

/**
 * Fetch REAL nearby gas stations from Google Places API

 */
export async function fetchNearbyGasStations(
  lat: number,
  lon: number,
  radiusMeters: number = 10000
): Promise<GasStationPlace[]> {
  try {
    const res = await fetchGasStationsPaginated(lat, lon, radiusMeters);
    return res.results;
  } catch (error) {
    console.warn('Google Places API error:', error);
    return [];
  }
}

export interface PaginatedPlacesResponse {
  results: GasStationPlace[];
  nextPageToken?: string;
}

// Map a backend GasStation document → the app's GasStationPlace shape.
// photoRef carries the brand-logo URL (DB stations have no Google photo).
function mapDbStation(s: any): GasStationPlace {
  const coords = s.location?.coordinates || [];
  return {
    id: String(s._id || s.id),
    name: s.name,
    lat: typeof s.lat === 'number' ? s.lat : coords[1],
    lon: typeof s.lon === 'number' ? s.lon : coords[0],
    address: s.address || [s.city, s.state, s.zipCode].filter(Boolean).join(', '),
    rating: s.rating || 0,
    totalRatings: s.totalRatings || 0,
    isOpen: s.operatingHours?.is24Hours ? true : null,
    photoRef: getStationImageUrl(s.name || s.brand || ''),
    types: s.amenities || [],
  };
}

/**
 * Nearby gas stations — served from our own DB (OSM-imported). No paid Places call.
 * One DB call returns everything in range, so there's no pagination token.
 */
export async function fetchGasStationsPaginated(
  lat: number,
  lon: number,
  radiusMeters: number = 30000,
  pageToken?: string
): Promise<PaginatedPlacesResponse> {
  if (pageToken) return { results: [], nextPageToken: undefined };
  try {
    const res = await api.get('/stations/nearby', {
      params: { lat, lng: lon, radius: radiusMeters / 1609.34, limit: 50 },
      timeout: 15000,
    });
    const stations = res.data?.data || [];
    return { results: stations.map(mapDbStation), nextPageToken: undefined };
  } catch (error) {
    console.warn('DB nearby stations error:', error);
    return { results: [] };
  }
}

/**
 * Search stations by name / brand / address — from our DB. Sorted nearest-first.
 */
export async function searchGasStations(
  query: string,
  lat: number,
  lon: number
): Promise<GasStationPlace[]> {
  try {
    const res = await api.get('/stations/search', { params: { q: query, limit: 25 }, timeout: 12000 });
    const stations: GasStationPlace[] = (res.data?.data || []).map(mapDbStation);
    return stations.sort(
      (a, b) => calculateDistanceMiles(lat, lon, a.lat, a.lon) - calculateDistanceMiles(lat, lon, b.lat, b.lon)
    );
  } catch (error) {
    console.warn('DB search error:', error);
    return [];
  }
}

// ─── Route / Directions (Google Routes API "New") ───

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  points: RoutePoint[];      // decoded polyline for drawing the green line
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;      // e.g. "8.8 mi"
  durationText: string;      // e.g. "13 min"
}

/**
 * Decode a Google encoded polyline string into lat/lng points.
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) return `${Math.round(meters)} m`;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs} hr` : `${hrs} hr ${rem} min`;
}

/**
 * Compute the shortest driving route between two coordinates using the
 * Google Routes API (the legacy Directions API is disabled on this key).
 * Returns the decoded polyline plus ETA/distance, or null on failure.
 */
export async function getRoute(
  origin: RoutePoint,
  destination: RoutePoint
): Promise<RouteResult | null> {
  try {
    const res = await axios.post(
      '/routes-api/directions/v2:computeRoutes',
      {
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        polylineQuality: 'HIGH_QUALITY',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        timeout: 12000,
      }
    );

    const route = res.data?.routes?.[0];
    const encoded = route?.polyline?.encodedPolyline;
    if (!route || !encoded) return null;

    const distanceMeters = route.distanceMeters ?? 0;
    const durationSeconds = parseInt(String(route.duration || '0').replace('s', ''), 10) || 0;

    return {
      points: decodePolyline(encoded),
      distanceMeters,
      durationSeconds,
      distanceText: formatDistance(distanceMeters),
      durationText: formatDuration(durationSeconds),
    };
  } catch (error) {
    console.warn('Google Routes API error:', error);
    return null;
  }
}

/**
 * Photo URL. DB stations carry a brand-logo URL in photoRef, so pass full URLs
 * through unchanged. (Falls back to the Places photo proxy for any legacy ref.)
 */
export function getPhotoUrl(photoRef: string, maxWidth: number = 400): string {
  if (!photoRef) return '';
  if (/^https?:\/\//.test(photoRef)) return photoRef;
  return `${PLACES_BASE}/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${GOOGLE_MAPS_API_KEY}`;
}

/**
 * Fetch a single station's details from our DB by id.
 */
export async function getPlaceDetails(placeId: string): Promise<GasStationPlace | null> {
  try {
    const res = await api.get(`/stations/${placeId}`, { timeout: 12000 });
    const s = res.data?.data;
    if (!s) return null;
    return mapDbStation(s);
  } catch (error) {
    console.warn('DB station details error:', error);
    return null;
  }
}
