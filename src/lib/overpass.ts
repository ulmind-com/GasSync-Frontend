// ============================================================
// GasSync - Overpass API (OpenStreetMap) — Gas Station Discovery
// ============================================================
// Replaces Google Places API with FREE Overpass API
// No API key needed, no rate limit concerns for normal usage

import axios from 'axios';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const GOOGLE_MAPS_API_KEY = 'AIzaSyCe6KCXl5MO1INT16N9I_kiMwXxwZHJc8o';

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
  brand?: string;
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

// ─── Parse OSM opening_hours to boolean ───
function parseOpeningHours(ohString?: string): boolean | null {
  if (!ohString) return null;
  if (ohString === '24/7') return true;

  try {
    const now = new Date();
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const currentDay = dayNames[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const rules = ohString.split(';').map(r => r.trim());
    for (const rule of rules) {
      const match = rule.match(/^([A-Za-z, -]+)\s+(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/);
      if (!match) continue;

      const dayRange = match[1];
      const openMin = parseInt(match[2]) * 60 + parseInt(match[3]);
      const closeMin = parseInt(match[4]) * 60 + parseInt(match[5]);

      const dayParts = dayRange.split(',').map(d => d.trim());
      for (const part of dayParts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(d => d.trim());
          const startIdx = dayNames.indexOf(start);
          const endIdx = dayNames.indexOf(end);
          const curIdx = dayNames.indexOf(currentDay);
          if (startIdx >= 0 && endIdx >= 0 && curIdx >= 0) {
            const inRange = startIdx <= endIdx
              ? curIdx >= startIdx && curIdx <= endIdx
              : curIdx >= startIdx || curIdx <= endIdx;
            if (inRange && currentMinutes >= openMin && currentMinutes < closeMin) {
              return true;
            }
          }
        } else if (part === currentDay) {
          if (currentMinutes >= openMin && currentMinutes < closeMin) return true;
        }
      }
    }
    return false;
  } catch {
    return null;
  }
}

// ─── Build address from OSM tags ───
function buildAddress(tags: Record<string, string>): string {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
    tags['addr:state'],
    tags['addr:postcode'],
  ].filter(Boolean);
  return parts.join(', ') || tags['addr:full'] || '';
}

// ─── Map OSM element to GasStationPlace ───
function mapOsmToStation(element: any): GasStationPlace {
  const tags = element.tags || {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  const brand = tags.brand || tags.operator || '';

  return {
    id: `${element.type}/${element.id}`,
    name: tags.name || brand || 'Gas Station',
    lat,
    lon,
    address: buildAddress(tags),
    rating: 0,
    totalRatings: 0,
    isOpen: parseOpeningHours(tags.opening_hours),
    photoRef: null,
    types: ['gas_station'],
    brand: brand || undefined,
  };
}

/**
 * Fetch nearby gas stations from Overpass API (OpenStreetMap)
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
    console.warn('Overpass API error:', error);
    return [];
  }
}

export interface PaginatedPlacesResponse {
  results: GasStationPlace[];
  hasMore: boolean;
  totalCount: number;
}

let _cachedStations: GasStationPlace[] = [];
let _cacheKey = '';

export async function fetchGasStationsPaginated(
  lat: number,
  lon: number,
  radiusMeters: number = 30000,
  page: number = 0,
  pageSize: number = 20
): Promise<PaginatedPlacesResponse> {
  try {
    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)},${radiusMeters}`;

    if (_cacheKey !== cacheKey || _cachedStations.length === 0) {
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="fuel"](around:${Math.min(radiusMeters, 15000)},${lat},${lon});
          way["amenity"="fuel"](around:${Math.min(radiusMeters, 15000)},${lat},${lon});
        );
        out center body;
      `;

      const res = await axios.post(
        OVERPASS_API,
        `data=${encodeURIComponent(query)}`,
        {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000,
        }
      );

      const elements = res.data?.elements || [];
      const stations = elements
        .filter((el: any) => (el.lat ?? el.center?.lat) != null)
        .map(mapOsmToStation);

      const unique = new Map<string, GasStationPlace>();
      stations.forEach((s: GasStationPlace) => {
        if (!unique.has(s.id)) unique.set(s.id, s);
      });

      _cachedStations = Array.from(unique.values()).sort(
        (a, b) => calculateDistanceMiles(lat, lon, a.lat, a.lon) - calculateDistanceMiles(lat, lon, b.lat, b.lon)
      );
      _cacheKey = cacheKey;
    }

    const start = page * pageSize;
    const slice = _cachedStations.slice(start, start + pageSize);

    return {
      results: slice,
      hasMore: start + pageSize < _cachedStations.length,
      totalCount: _cachedStations.length,
    };
  } catch (error) {
    console.warn('Overpass API Pagination error:', error);
    return { results: [], hasMore: false, totalCount: 0 };
  }
}

export async function searchGasStations(
  query: string,
  lat: number,
  lon: number
): Promise<GasStationPlace[]> {
  try {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="fuel"]["name"~"${escapedQuery}",i](around:20000,${lat},${lon});
        way["amenity"="fuel"]["name"~"${escapedQuery}",i](around:20000,${lat},${lon});
        node["amenity"="fuel"]["brand"~"${escapedQuery}",i](around:20000,${lat},${lon});
        way["amenity"="fuel"]["brand"~"${escapedQuery}",i](around:20000,${lat},${lon});
        node["amenity"="fuel"]["operator"~"${escapedQuery}",i](around:20000,${lat},${lon});
        way["amenity"="fuel"]["operator"~"${escapedQuery}",i](around:20000,${lat},${lon});
      );
      out center body;
    `;

    const res = await axios.post(
      OVERPASS_API,
      `data=${encodeURIComponent(overpassQuery)}`,
      {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 30000,
      }
    );

    const elements = res.data?.elements || [];
    const stations = elements
      .filter((el: any) => (el.lat ?? el.center?.lat) != null)
      .map(mapOsmToStation);

    const unique = new Map<string, GasStationPlace>();
    stations.forEach((s: GasStationPlace) => {
      if (!unique.has(s.id)) unique.set(s.id, s);
    });

    return Array.from(unique.values()).sort(
      (a, b) => calculateDistanceMiles(lat, lon, a.lat, a.lon) - calculateDistanceMiles(lat, lon, b.lat, b.lon)
    );
  } catch (error) {
    console.warn('Overpass search error:', error);
    return [];
  }
}

export function getPhotoUrl(_photoRef: string, _maxWidth: number = 400): string {
  return 'https://img.icons8.com/fluency/96/gas-station.png';
}

export async function getPlaceDetails(placeId: string): Promise<GasStationPlace | null> {
  try {
    const match = placeId.match(/^(node|way)\/(\d+)$/);
    if (!match) {
      console.warn('getPlaceDetails: Not an OSM ID:', placeId);
      return null;
    }

    const [, osmType, osmId] = match;

    const query = `
      [out:json][timeout:10];
      ${osmType}(${osmId});
      out center body;
    `;

    const res = await axios.post(
      OVERPASS_API,
      `data=${encodeURIComponent(query)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }
    );

    const element = res.data?.elements?.[0];
    if (!element) return null;

    return mapOsmToStation(element);
  } catch (error) {
    console.warn('Overpass details error:', error);
    return null;
  }
}

// ─── Route / Directions (Google Routes API "New") ───
// Maintained for Navigation logic if ever used

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  points: RoutePoint[];
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
}

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

export async function getRoute(
  origin: RoutePoint,
  destination: RoutePoint
): Promise<RouteResult | null> {
  try {
    const res = await axios.post(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
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
