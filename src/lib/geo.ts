// ─── Geometry helpers for turn-by-turn route following ───
// Operate on { lat, lng } points (the same shape used by the Routes polyline).

export interface LatLng {
  lat: number;
  lng: number;
}

const R = 6371008.8; // mean Earth radius in metres
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance between two points, in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial compass bearing (0–360°, 0 = north) from a → b. */
export function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export interface RoutePath {
  points: LatLng[];
  /** Cumulative distance (metres) from the start to each point. */
  cumulative: number[];
  /** Total route length in metres. */
  total: number;
}

/** Pre-compute cumulative distances so we can locate any point in O(log n). */
export function buildRoutePath(points: LatLng[]): RoutePath {
  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative[i] = cumulative[i - 1] + haversine(points[i - 1], points[i]);
  }
  return { points, cumulative, total: cumulative[cumulative.length - 1] || 0 };
}

export interface RoutePosition {
  lat: number;
  lng: number;
  heading: number;
  /** Index of the segment the position sits on. */
  segment: number;
}

/**
 * Interpolate a position `metres` along the route, plus the heading the
 * vehicle is travelling in at that point. Clamps to the route ends.
 */
export function locateAlongRoute(path: RoutePath, metres: number): RoutePosition {
  const { points, cumulative, total } = path;
  if (points.length === 0) return { lat: 0, lng: 0, heading: 0, segment: 0 };
  if (points.length === 1)
    return { ...points[0], heading: 0, segment: 0 };

  if (metres <= 0) {
    return { ...points[0], heading: bearing(points[0], points[1]), segment: 0 };
  }
  if (metres >= total) {
    const n = points.length - 1;
    return { ...points[n], heading: bearing(points[n - 1], points[n]), segment: n - 1 };
  }

  // Binary search for the segment that contains `metres`.
  let lo = 1;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] < metres) lo = mid + 1;
    else hi = mid;
  }
  const i = lo;
  const segStart = cumulative[i - 1];
  const segEnd = cumulative[i];
  const t = segEnd > segStart ? (metres - segStart) / (segEnd - segStart) : 0;
  const a = points[i - 1];
  const b = points[i];
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
    heading: bearing(a, b),
    segment: i - 1,
  };
}

/**
 * Ease a heading toward a target taking the shortest rotation around the
 * 360° wrap. `factor` is 0–1 (higher = snappier). Keeps camera rotation
 * smooth instead of snapping at every turn.
 */
export function smoothHeading(current: number, target: number, factor: number): number {
  const diff = ((target - current + 540) % 360) - 180;
  return (current + diff * factor + 360) % 360;
}

export interface RouteSnap {
  lat: number;
  lng: number;
  /** Distance travelled from the route start to this snapped point (metres). */
  distanceAlong: number;
  /** Heading of the route segment the point snapped to. */
  heading: number;
  /** Perpendicular distance from the raw point to the route (metres). */
  offset: number;
}

/**
 * Project a raw GPS point onto the nearest point of the route polyline.
 * Used to make the live position "follow the route" instead of drifting
 * off the line, and to derive how far along the route the user is.
 */
export function snapToRoute(path: RoutePath, point: LatLng): RouteSnap {
  const { points, cumulative } = path;
  if (points.length < 2) {
    return { lat: point.lat, lng: point.lng, distanceAlong: 0, heading: 0, offset: 0 };
  }

  // Work in a local planar frame (metres) centred on the raw point so the
  // perpendicular projection is accurate over the short route segments.
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(toRad(point.lat));
  const toXY = (q: LatLng) => ({
    x: (q.lng - point.lng) * mPerDegLng,
    y: (q.lat - point.lat) * mPerDegLat,
  });

  let best = { d2: Infinity, i: 1, t: 0 };
  for (let i = 1; i < points.length; i++) {
    const a = toXY(points[i - 1]);
    const b = toXY(points[i]);
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    // The raw point is the origin (0,0); project it onto segment a→b.
    let t = len2 > 0 ? -(a.x * abx + a.y * aby) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + abx * t;
    const cy = a.y + aby * t;
    const d2 = cx * cx + cy * cy;
    if (d2 < best.d2) best = { d2, i, t };
  }

  const a = points[best.i - 1];
  const b = points[best.i];
  const segLen = haversine(a, b);
  return {
    lat: a.lat + (b.lat - a.lat) * best.t,
    lng: a.lng + (b.lng - a.lng) * best.t,
    distanceAlong: cumulative[best.i - 1] + segLen * best.t,
    heading: bearing(a, b),
    offset: Math.sqrt(best.d2),
  };
}
