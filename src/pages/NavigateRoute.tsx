import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, ExternalLink, Loader2, Clock, Navigation, X, LocateFixed } from 'lucide-react';
import { getPlaceDetails, getRoute, type GasStationPlace, type RouteResult } from '../lib/overpass';
import { buildRoutePath, smoothHeading, snapToRoute, haversine, bearing, offsetPoint, headingDelta, type LatLng } from '../lib/geo';
import { useLocationStore } from '../store/locationStore';
import { useThemeStore } from '../store/themeStore';

// ─── Live-GPS navigation tunables ───
// Movement is driven 100% by real device GPS fixes — there is NO simulation,
// timer, or polyline auto-progression anywhere. These constants only filter
// noise and shape the camera, exactly like Google Maps live navigation.
const GPS_MAX_ACCURACY_M = 60;       // drop fixes noisier than this (metres)
const STATIONARY_MOVE_M = 2.5;       // moves smaller than this (at low speed) = standing still
const STATIONARY_SPEED_MPS = 0.5;    // ~1.8 km/h — below this we treat the device as stopped
const HEADING_MIN_SPEED_MPS = 0.7;   // only trust the device compass heading above this speed
const HEADING_MIN_MOVE_M = 3;        // or derive heading once we've moved at least this far
const OFFROUTE_M = 60;               // perpendicular distance that counts as "off the route"
const OFFROUTE_FIXES_TO_REROUTE = 4; // consecutive off-route fixes before we recompute
const ARRIVE_M = 25;                 // distance-to-destination that counts as arrived
const FOLLOW_ZOOM = 18;
const FOLLOW_TILT = 55;
const CAMERA_LEAD_M = 80;            // push the camera target ahead so the puck sits low on screen

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "administrative.land_parcel", "stylers": [{ "visibility": "off" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

const PRIMARY = '#34C759';
const PRIMARY_DARK = '#2EAE4E';

// "Your location" blue pulsing dot
const originIcon = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="20" fill="#208AEF" opacity="0.18"/>
    <circle cx="22" cy="22" r="13" fill="#208AEF" opacity="0.28"/>
    <circle cx="22" cy="22" r="7" fill="#208AEF" stroke="white" stroke-width="3"/>
  </svg>`
)}`;

// Destination gas-station pin (green)
const destIcon = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="58" viewBox="0 0 46 58">
    <defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
    </filter></defs>
    <path filter="url(#s)" d="M23 2C12.5 2 4 10.5 4 21c0 13.5 19 33 19 33s19-19.5 19-33C42 10.5 33.5 2 23 2z" fill="#34C759" stroke="white" stroke-width="2.5"/>
    <g fill="white">
      <rect x="15" y="13" width="11" height="16" rx="2"/>
      <rect x="17" y="16" width="7" height="5" rx="1" fill="#34C759"/>
      <path d="M27 16l3 3v8a2.5 2.5 0 0 0 2.5 2.5A2.5 2.5 0 0 0 35 27v-8.5L30.5 14l-1.5 1.5 2 2v1.5h-3z"/>
    </g>
  </svg>`
)}`;

// Live-navigation vehicle puck (blue Google-style chevron). The follow camera
// rotates to the heading, so a fixed up-pointing arrow always faces travel.
const vehicleIcon = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <circle cx="30" cy="30" r="26" fill="#208AEF" opacity="0.16"/>
    <circle cx="30" cy="30" r="18" fill="#fff"/>
    <circle cx="30" cy="30" r="16" fill="#208AEF"/>
    <path d="M30 18 L39 38 L30 33 L21 38 Z" fill="#fff"/>
  </svg>`
)}`;

export default function NavigateRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lat, lon, setLocation } = useLocationStore();
  const { isDark } = useThemeStore();

  const [station, setStation] = useState<GasStationPlace | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeFailed, setRouteFailed] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCe6KCXl5MO1INT16N9I_kiMwXxwZHJc8o'
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const routeRequestedRef = useRef(false);
  const flowLineRef = useRef<google.maps.Polyline | null>(null);

  // ─── Live navigation state ───
  const [isNavigating, setIsNavigating] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [vehicle, setVehicle] = useState<LatLng | null>(null);
  const [remainingMeters, setRemainingMeters] = useState<number | null>(null);
  const [rerouting, setRerouting] = useState(false);
  const [gpsReady, setGpsReady] = useState(false); // first real fix received

  // Camera follows the vehicle until the user drags the map; then we show a
  // "Re-centre" button (Google-Maps style). Ref so the live loop reads it live.
  const followingRef = useRef(true);
  const [showRecenter, setShowRecenter] = useState(false);

  // ─── Live-navigation refs (driven by real GPS only) ───
  const renderedRef = useRef<LatLng | null>(null);    // position currently drawn on screen
  const targetRef = useRef<LatLng | null>(null);      // latest real GPS target to settle toward
  const headingRef = useRef(0);                       // target heading from real movement
  const smoothHeadingRef = useRef(0);                 // displayed (eased) heading
  const lastAcceptedRef = useRef<LatLng | null>(null);// last accepted raw GPS fix
  const animRef = useRef(0);                          // settle-animation RAF id (0 = idle)
  const lastFrameRef = useRef(0);
  const offRouteCountRef = useRef(0);
  const reroutingRef = useRef(false);
  const arrivedRef = useRef(false);
  const gpsReadyRef = useRef(false);
  const hadOnRouteRef = useRef(false);

  // Pre-computed cumulative distances along the route for smooth interpolation.
  const routePath = useMemo(
    () => (route && route.points.length > 1 ? buildRoutePath(route.points) : null),
    [route]
  );

  // ─── Resolve current location ───
  useEffect(() => {
    if (lat !== null && lon !== null) return;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setLocation(position.coords.latitude, position.coords.longitude, 'Your Location'),
        () => setLocation(29.7604, -95.3698, 'Houston, TX'),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocation(29.7604, -95.3698, 'Houston, TX');
    }
  }, [lat, lon, setLocation]);

  // ─── Fetch the selected station ───
  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }
    (async () => {
      try {
        const data = await getPlaceDetails(id);
        if (data) setStation(data);
        else setError('Station not found');
      } catch {
        setError('Failed to load station details');
      }
    })();
  }, [id, navigate]);

  // ─── Compute the shortest route once station + location are ready ───
  useEffect(() => {
    if (!station || lat === null || lon === null || routeRequestedRef.current) return;
    routeRequestedRef.current = true;

    (async () => {
      // If the user is implausibly far from the station (e.g. demo data in
      // another country), synthesize a nearby origin so a drivable route exists.
      const isFar = Math.abs(lat - station.lat) > 3 || Math.abs(lon - station.lon) > 3;
      const start = isFar
        ? { lat: station.lat + 0.045, lng: station.lon + 0.03 }
        : { lat, lng: lon };

      setOrigin(start);

      let result = await getRoute(start, { lat: station.lat, lng: station.lon });

      // Fallback: if the real origin produced no route, retry from a nearby point.
      if (!result && !isFar) {
        const nearby = { lat: station.lat + 0.045, lng: station.lon + 0.03 };
        setOrigin(nearby);
        result = await getRoute(nearby, { lat: station.lat, lng: station.lon });
      }

      if (result) setRoute(result);
      else setRouteFailed(true);
    })();
  }, [station, lat, lon]);

  // ─── Fit the map to the whole route (overview only — never while navigating,
  // so a reroute mid-trip doesn't yank the follow camera off the vehicle) ───
  useEffect(() => {
    if (!map || !route || route.points.length === 0 || isNavigating) return;
    const bounds = new google.maps.LatLngBounds();
    route.points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 130, bottom: 300, left: 70, right: 70 });
  }, [map, route, isNavigating]);

  // ─── Animate a flowing dash along the route ───
  useEffect(() => {
    if (!route) return;
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame = (frame + 0.4) % 100;
      const line = flowLineRef.current;
      if (line) {
        const icons = line.get('icons');
        if (icons && icons[0]) {
          icons[0].offset = `${frame}%`;
          line.set('icons', icons);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [route]);

  // ─── Live navigation engine — 100% real GPS, no simulation ───
  // The vehicle/camera/progress react ONLY to fixes from the device's GPS via
  // watchPosition. Between two real fixes the marker *settles* toward the most
  // recent fix (so motion is smooth, never jumpy) and then stops — it never
  // invents forward movement. Stand still → nothing moves. GPS pauses → the
  // puck freezes at the last real position.
  useEffect(() => {
    if (!isNavigating || !routePath || !map || !station) return;
    const destination: LatLng = { lat: station.lat, lng: station.lon };

    // Where the camera should look: a little ahead of the puck along its
    // heading, so the user sits near the bottom of the screen (Google style).
    const cameraTarget = (p: LatLng, heading: number) =>
      offsetPoint(p, heading, CAMERA_LEAD_M);

    // Settle animation: ease the drawn position toward the latest GPS target,
    // then halt. Triggered by each fix; self-terminating when caught up.
    const settle = (now: number) => {
      const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = now;
      const target = targetRef.current;
      const cur = renderedRef.current;
      if (!target || !cur) { animRef.current = 0; return; }

      const kPos = 1 - Math.exp(-dt / 0.4);    // ~0.4s time-constant: gently chase
                                               // the latest real fix, never past it
      const next: LatLng = {
        lat: cur.lat + (target.lat - cur.lat) * kPos,
        lng: cur.lng + (target.lng - cur.lng) * kPos,
      };
      renderedRef.current = next;
      smoothHeadingRef.current = smoothHeading(smoothHeadingRef.current, headingRef.current, 0.18);
      setVehicle(next);
      if (followingRef.current) {
        map.moveCamera({
          center: cameraTarget(next, smoothHeadingRef.current),
          zoom: FOLLOW_ZOOM,
          tilt: FOLLOW_TILT,
          heading: smoothHeadingRef.current,
        });
      }

      const posSettled = haversine(next, target) < 0.4;
      const headSettled = Math.abs(headingDelta(smoothHeadingRef.current, headingRef.current)) < 0.5;
      if (posSettled && headSettled) {
        // Caught up to the real fix — stop. No continued/automatic animation.
        renderedRef.current = target;
        setVehicle(target);
        animRef.current = 0;
        return;
      }
      animRef.current = requestAnimationFrame(settle);
    };
    const kickSettle = () => {
      if (animRef.current === 0) {
        lastFrameRef.current = performance.now();
        animRef.current = requestAnimationFrame(settle);
      }
    };

    // Recompute the route from the live position when the driver has clearly
    // left it. Replacing `route` rebuilds routePath and restarts this effect.
    const reroute = async (from: LatLng) => {
      if (reroutingRef.current) return;
      reroutingRef.current = true;
      setRerouting(true);
      const result = await getRoute({ lat: from.lat, lng: from.lng }, destination);
      if (result && result.points.length > 1) setRoute(result);
      offRouteCountRef.current = 0;
      reroutingRef.current = false;
      setRerouting(false);
    };

    const onFix = (pos: GeolocationPosition) => {
      const raw: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const accuracy = pos.coords.accuracy;
      const speed = pos.coords.speed; // m/s or null

      // 1) Reject noisy fixes outright.
      if (typeof accuracy === 'number' && accuracy > GPS_MAX_ACCURACY_M) return;

      if (!gpsReadyRef.current) { gpsReadyRef.current = true; setGpsReady(true); }

      const last = lastAcceptedRef.current;
      const moved = last ? haversine(last, raw) : Infinity;
      const movingBySpeed = typeof speed === 'number' && speed > STATIONARY_SPEED_MPS;

      // 2) Standing still → ignore jitter so the puck/heading stay rock-steady.
      if (last && moved < STATIONARY_MOVE_M && !movingBySpeed) return;

      // 3) Heading from real motion only (keep the last heading when stopped).
      if (last && moved >= HEADING_MIN_MOVE_M) {
        headingRef.current = bearing(last, raw);
      } else if (
        movingBySpeed &&
        typeof pos.coords.heading === 'number' &&
        !Number.isNaN(pos.coords.heading) &&
        (speed ?? 0) > HEADING_MIN_SPEED_MPS
      ) {
        headingRef.current = pos.coords.heading;
      }

      // 4) Map-match to the route: snap onto the line + measure progress.
      const snap = snapToRoute(routePath, raw);
      let displayPos = raw;
      if (snap.offset <= OFFROUTE_M) {
        displayPos = { lat: snap.lat, lng: snap.lng };
        setRemainingMeters(Math.max(0, routePath.total - snap.distanceAlong));
        offRouteCountRef.current = 0;
        hadOnRouteRef.current = true;
        if (routePath.total - snap.distanceAlong < ARRIVE_M && !arrivedRef.current) {
          arrivedRef.current = true;
          targetRef.current = displayPos;
          renderedRef.current = displayPos;
          setVehicle(displayPos);
          setRemainingMeters(0);
          setArrived(true);
          setIsNavigating(false);
          return;
        }
      } else {
        // Off-route: show the true GPS point and consider a reroute. Only
        // reroute once the driver has actually been on the route and then left
        // it — never from a start that was never on it (e.g. desktop testing).
        setRemainingMeters(haversine(raw, destination));
        offRouteCountRef.current += 1;
        if (hadOnRouteRef.current && offRouteCountRef.current >= OFFROUTE_FIXES_TO_REROUTE) reroute(raw);
      }

      // 5) Commit the new real target and animate toward it.
      lastAcceptedRef.current = raw;
      targetRef.current = displayPos;
      if (!renderedRef.current) {
        renderedRef.current = displayPos;
        smoothHeadingRef.current = headingRef.current;
        setVehicle(displayPos);
      }
      kickSettle();
    };

    // A manual drag releases the camera so the user can look around freely.
    const dragListener = map.addListener('dragstart', () => {
      if (followingRef.current) {
        followingRef.current = false;
        setShowRecenter(true);
      }
    });

    let watchId: number | null = null;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        onFix,
        () => { /* transient GPS error — keep the last real position, never fake one */ },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      );
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = 0;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      google.maps.event.removeListener(dragListener);
    };
  }, [isNavigating, routePath, map, station]);

  const startNavigation = () => {
    if (!routePath || !origin) return;
    // Reset all live-nav refs and seed the puck at the real starting location.
    renderedRef.current = origin;
    targetRef.current = origin;
    lastAcceptedRef.current = null;
    const startHeading = bearing(origin, route!.points[Math.min(1, route!.points.length - 1)]);
    headingRef.current = startHeading;
    smoothHeadingRef.current = startHeading;
    offRouteCountRef.current = 0;
    arrivedRef.current = false;
    gpsReadyRef.current = false;
    hadOnRouteRef.current = false;
    followingRef.current = true;
    setShowRecenter(false);
    setGpsReady(false);
    setVehicle(origin);
    setArrived(false);
    setRemainingMeters(routePath.total);
    if (map) {
      map.moveCamera({ center: offsetPoint(origin, startHeading, CAMERA_LEAD_M), zoom: FOLLOW_ZOOM, tilt: FOLLOW_TILT, heading: startHeading });
    }
    setIsNavigating(true);
  };

  // Re-lock the camera onto the live position after a manual pan.
  const recenter = useCallback(() => {
    followingRef.current = true;
    setShowRecenter(false);
    const p = renderedRef.current;
    if (map && p) {
      map.moveCamera({ center: offsetPoint(p, smoothHeadingRef.current, CAMERA_LEAD_M), zoom: FOLLOW_ZOOM, tilt: FOLLOW_TILT, heading: smoothHeadingRef.current });
    }
  }, [map]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setVehicle(null);
    setRemainingMeters(null);
    setArrived(false);
    setRerouting(false);
    setShowRecenter(false);
    renderedRef.current = null;
    targetRef.current = null;
    lastAcceptedRef.current = null;
    arrivedRef.current = false;
    hadOnRouteRef.current = false;
    if (map && route) {
      // Restore the north-up overview of the whole route.
      const bounds = new google.maps.LatLngBounds();
      route.points.forEach((p) => bounds.extend(p));
      map.moveCamera({ tilt: 0, heading: 0 });
      map.fitBounds(bounds, { top: 130, bottom: 300, left: 70, right: 70 });
    }
  }, [map, route]);

  const openNativeMaps = () => {
    if (!station) return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      window.location.href = `http://maps.apple.com/?daddr=${station.lat},${station.lon}`;
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`, '_blank');
    }
  };

  const onLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const onUnmount = useCallback(() => setMap(null), []);

  if (!isLoaded || (!station && !error)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 size={40} className="text-primary animate-spin mb-4" />
        <p className="text-textMuted font-medium">Preparing route...</p>
      </div>
    );
  }

  // Live remaining distance/time while navigating; falls back to the full route.
  const fractionLeft =
    routePath && routePath.total > 0 && remainingMeters !== null
      ? Math.max(0, Math.min(1, remainingMeters / routePath.total))
      : 1;
  const remainingSeconds = route ? Math.round(route.durationSeconds * fractionLeft) : 0;

  const formatMeters = (m: number) => {
    const miles = m / 1609.344;
    if (miles < 0.1) return `${Math.round(m * 3.281 / 10) * 10} ft`;
    if (miles < 10) return `${miles.toFixed(1)} mi`;
    return `${Math.round(miles)} mi`;
  };
  const formatSecs = (s: number) => {
    const mins = Math.round(s / 60);
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const r = mins % 60;
    return r === 0 ? `${h} hr` : `${h} hr ${r} min`;
  };

  const liveDurationText =
    isNavigating && remainingMeters !== null ? formatSecs(remainingSeconds) : route?.durationText ?? '';
  const liveDistanceText =
    isNavigating && remainingMeters !== null ? formatMeters(remainingMeters) : route?.distanceText ?? '';

  const arrivalTime = route
    ? new Date(Date.now() + remainingSeconds * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;

  const center = origin
    ? origin
    : station
      ? { lat: station.lat, lng: station.lon }
      : { lat: 29.76, lng: -95.36 };

  return (
    <div className="fixed inset-0 z-40 bg-background overflow-hidden flex flex-col">
      {/* ─── Map ─── */}
      <div className="absolute inset-0 z-0">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          zoom={14}
          center={center}
          options={{
            disableDefaultUI: true,
            zoomControl: false,
            clickableIcons: false,
            gestureHandling: 'greedy',
            styles: isDark ? darkMapStyle : [],
            mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '1b411d94b05a74df'
          }}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          {route && (
            <>
              {/* Outer casing for contrast */}
              <Polyline
                path={route.points}
                options={{
                  strokeColor: isDark ? '#0A1C12' : '#FFFFFF',
                  strokeOpacity: 0.9,
                  strokeWeight: 13,
                  zIndex: 1,
                }}
              />
              {/* Glow */}
              <Polyline
                path={route.points}
                options={{
                  strokeColor: PRIMARY,
                  strokeOpacity: 0.25,
                  strokeWeight: 16,
                  zIndex: 2,
                }}
              />
              {/* Main green line */}
              <Polyline
                path={route.points}
                options={{
                  strokeColor: PRIMARY,
                  strokeOpacity: 1,
                  strokeWeight: 7,
                  zIndex: 3,
                }}
              />
              {/* Animated flowing dashes */}
              <Polyline
                path={route.points}
                onLoad={(line) => { flowLineRef.current = line; }}
                options={{
                  strokeOpacity: 0,
                  zIndex: 4,
                  icons: [{
                    icon: {
                      path: 'M 0,-1 0,1',
                      strokeColor: '#FFFFFF',
                      strokeOpacity: 0.9,
                      strokeWeight: 3,
                      scale: 3,
                    },
                    offset: '0%',
                    repeat: '22px',
                  }],
                }}
              />
            </>
          )}

          {/* Static "your location" dot — replaced by the moving vehicle once navigating */}
          {origin && !isNavigating && !vehicle && (
            <Marker position={origin} icon={{ url: originIcon, scaledSize: new google.maps.Size(44, 44), anchor: new google.maps.Point(22, 22) }} zIndex={998} />
          )}
          {/* Live moving vehicle */}
          {vehicle && (
            <Marker position={vehicle} icon={{ url: vehicleIcon, scaledSize: new google.maps.Size(60, 60), anchor: new google.maps.Point(30, 30) }} zIndex={1000} />
          )}
          {station && <Marker position={{ lat: station.lat, lng: station.lon }} icon={{ url: destIcon, scaledSize: new google.maps.Size(46, 58), anchor: new google.maps.Point(23, 56) }} zIndex={999} />}
        </GoogleMap>
      </div>

      {/* ─── Back button ─── */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-4 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-surface/90 backdrop-blur-xl shadow-premium flex items-center justify-center transition-transform active:scale-90"
        aria-label="Back"
      >
        <ArrowLeft size={20} className="text-textPrimary" />
      </button>

      {/* ─── Live status pill (rerouting / waiting for GPS) ─── */}
      <AnimatePresence>
        {isNavigating && (rerouting || !gpsReady) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-surface/95 backdrop-blur-xl shadow-premium rounded-full px-4 py-2"
          >
            <Loader2 size={15} className="text-primary animate-spin" />
            <span className="text-[13px] font-semibold text-textPrimary">
              {rerouting ? 'Rerouting…' : 'Waiting for GPS…'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Re-centre button (after a manual pan, Google-Maps style) ─── */}
      <AnimatePresence>
        {isNavigating && showRecenter && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={recenter}
            className="absolute bottom-48 right-4 z-30 w-12 h-12 rounded-full bg-surface/95 backdrop-blur-xl shadow-premium-lg flex items-center justify-center transition-transform active:scale-90"
            aria-label="Re-centre map on your location"
          >
            <LocateFixed size={22} className="text-primary" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── "Calculating route..." overlay ─── */}
      <AnimatePresence>
        {!route && !routeFailed && !error && station && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none px-6"
          >
            <div className="bg-surface/95 backdrop-blur-xl shadow-premium-lg rounded-3xl px-8 py-7 flex flex-col items-center justify-center pointer-events-auto">
              <Loader2 size={26} className="text-primary animate-spin mb-3.5" />
              <h3 className="font-bold text-base text-textPrimary">Finding shortest route...</h3>
              <p className="text-[13px] text-textSecondary mt-1">Calculating fastest way to {station.name}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom Trip Sheet ─── */}
      <AnimatePresence>
        {station && (
          <motion.div
            initial={{ y: 160, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 24, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pointer-events-none"
          >
            <div className="max-w-md mx-auto bg-surface/95 backdrop-blur-xl shadow-premium-lg rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 pointer-events-auto">
              {/* Station + ETA row */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/12 shrink-0">
                  <MapPin size={22} className="text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-[16px] leading-tight text-textPrimary truncate">
                    {station.name}
                  </h2>
                  <p className="text-[13px] text-textSecondary truncate">
                    {station.address || 'Selected fuel station'}
                  </p>
                </div>

                {route ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-end shrink-0 pl-2"
                  >
                    <span className="font-extrabold text-[22px] leading-none text-primary">{liveDurationText}</span>
                    <span className="text-[13px] font-medium text-textSecondary mt-1">{liveDistanceText}</span>
                  </motion.div>
                ) : routeFailed ? (
                  <span className="font-semibold text-sm text-textSecondary shrink-0 pl-2">No route</span>
                ) : (
                  <div className="flex flex-col items-end shrink-0 gap-1.5 pl-2">
                    <div className="w-16 h-6 bg-surfaceMuted rounded-md animate-pulse" />
                    <div className="w-10 h-3 bg-surfaceMuted rounded-md animate-pulse" />
                  </div>
                )}
              </div>

              {/* Arrival time / status */}
              <AnimatePresence>
                {arrived ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-1.5 mt-3 mb-1 px-1"
                  >
                    <MapPin size={14} className="text-primary" />
                    <span className="text-[13px] font-semibold text-primary">You've arrived at {station.name}</span>
                  </motion.div>
                ) : arrivalTime ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-1.5 mt-3 mb-1 px-1"
                  >
                    <Clock size={14} className="text-textSecondary" />
                    <span className="text-[13px] font-semibold text-textPrimary">Arrive by {arrivalTime}</span>
                    <span className="text-[13px] text-textSecondary">
                      {isNavigating ? '· en route' : '· fastest route'}
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex items-stretch gap-3 mt-4">
                <button
                  onClick={openNativeMaps}
                  className="w-14 rounded-2xl bg-surfaceMuted flex items-center justify-center shrink-0 transition-transform active:scale-95"
                  aria-label="Open in Maps app"
                >
                  <ExternalLink size={22} className="text-textSecondary" />
                </button>

                {arrived ? (
                  <button
                    onClick={() => navigate(-1)}
                    className="flex-1 h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-glow-primary text-white"
                    style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})` }}
                  >
                    <Navigation size={20} fill="white" />
                    Done
                  </button>
                ) : isNavigating ? (
                  <button
                    onClick={stopNavigation}
                    className="flex-1 h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 bg-red-500 text-white"
                  >
                    <X size={20} />
                    End Route
                  </button>
                ) : (
                  <button
                    onClick={startNavigation}
                    disabled={!route}
                    className="flex-1 h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-glow-primary text-white disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})` }}
                  >
                    <Navigation size={20} fill="white" />
                    Start
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
