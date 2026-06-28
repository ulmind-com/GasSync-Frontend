import axios from 'axios';

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

/**
 * Fetch REAL nearby gas stations from Google Places API with Pagination
 */
export async function fetchGasStationsPaginated(
  lat: number,
  lon: number,
  radiusMeters: number = 30000,
  pageToken?: string
): Promise<PaginatedPlacesResponse> {
  try {
    const params: any = {
      key: GOOGLE_MAPS_API_KEY,
    };

    if (pageToken) {
      params.pagetoken = pageToken;
    } else {
      params.location = `${lat},${lon}`;
      params.radius = radiusMeters;
      params.type = 'gas_station';
    }

    const res = await axios.get(`${PLACES_BASE}/nearbysearch/json`, {
      params,
      timeout: 10000,
    });

    const results = res.data?.results || [];
    const uniquePlaces = new Map<string, any>();
    results.forEach((place: any) => {
      if (!uniquePlaces.has(place.place_id)) {
        uniquePlaces.set(place.place_id, place);
      }
    });

    const mappedResults = Array.from(uniquePlaces.values()).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      lat: place.geometry.location.lat,
      lon: place.geometry.location.lng,
      address: place.vicinity || '',
      rating: place.rating || 0,
      totalRatings: place.user_ratings_total || 0,
      isOpen: place.opening_hours?.open_now ?? null,
      photoRef: place.photos?.[0]?.photo_reference || null,
    }));

    return {
      results: mappedResults,
      nextPageToken: res.data?.next_page_token,
    };
  } catch (error) {
    console.warn('Google Places API Pagination error:', error);
    return { results: [] };
  }
}

/**
 * Search gas stations by query text
 */
export async function searchGasStations(
  query: string,
  lat: number,
  lon: number
): Promise<GasStationPlace[]> {
  try {
    const res = await axios.get(`${PLACES_BASE}/textsearch/json`, {
      params: {
        query: `${query} gas station`,
        location: `${lat},${lon}`,
        radius: 30000,
        type: 'gas_station',
        key: GOOGLE_MAPS_API_KEY,
      },
      timeout: 10000,
    });

    const results = res.data?.results || [];
    const uniquePlaces = new Map<string, any>();
    results.forEach((place: any) => {
      if (!uniquePlaces.has(place.place_id)) {
        uniquePlaces.set(place.place_id, place);
      }
    });

    return Array.from(uniquePlaces.values()).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      lat: place.geometry.location.lat,
      lon: place.geometry.location.lng,
      address: place.formatted_address || place.vicinity || '',
      rating: place.rating || 0,
      totalRatings: place.user_ratings_total || 0,
      isOpen: place.opening_hours?.open_now ?? null,
      photoRef: place.photos?.[0]?.photo_reference || null,
    }));
  } catch (error) {
    console.warn('Google Places search error:', error);
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
 * Get photo URL from photo_reference
 */
export function getPhotoUrl(photoRef: string, maxWidth: number = 400): string {
  return `${PLACES_BASE}/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${GOOGLE_MAPS_API_KEY}`;
}

/**
 * Fetch details for a specific place by ID
 */
export async function getPlaceDetails(placeId: string): Promise<GasStationPlace | null> {
  try {
    const res = await axios.get(`${PLACES_BASE}/details/json`, {
      params: {
        place_id: placeId,
        fields: 'place_id,name,geometry,vicinity,rating,user_ratings_total,opening_hours,photos,types',
        key: GOOGLE_MAPS_API_KEY,
      },
      timeout: 10000,
    });

    const place = res.data?.result;
    if (!place) return null;

    return {
      id: place.place_id,
      name: place.name,
      lat: place.geometry.location.lat,
      lon: place.geometry.location.lng,
      address: place.vicinity || '',
      rating: place.rating || 0,
      totalRatings: place.user_ratings_total || 0,
      isOpen: place.opening_hours?.open_now ?? null,
      photoRef: place.photos?.[0]?.photo_reference || null,
      types: place.types || [],
    };
  } catch (error) {
    console.warn('Google Places details error:', error);
    return null;
  }
}
