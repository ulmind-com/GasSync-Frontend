import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, ExternalLink, Loader2, Clock, Navigation } from 'lucide-react';
import { getPlaceDetails, getRoute, type GasStationPlace, type RouteResult } from '../lib/overpass';
import { useLocationStore } from '../store/locationStore';
import { useThemeStore } from '../store/themeStore';

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
      navigate('/home');
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

  // ─── Fit the map to the whole route ───
  useEffect(() => {
    if (!map || !route || route.points.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    route.points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 130, bottom: 300, left: 70, right: 70 });
  }, [map, route]);

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

  const arrivalTime = route
    ? new Date(Date.now() + route.durationSeconds * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
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

          {origin && <Marker position={origin} icon={{ url: originIcon, scaledSize: new google.maps.Size(44, 44), anchor: new google.maps.Point(22, 22) }} zIndex={998} />}
          {station && <Marker position={{ lat: station.lat, lng: station.lon }} icon={{ url: destIcon, scaledSize: new google.maps.Size(46, 58), anchor: new google.maps.Point(23, 56) }} zIndex={999} />}
        </GoogleMap>
      </div>

      {/* ─── Back button ─── */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-4 z-30 w-11 h-11 rounded-full bg-surface/90 backdrop-blur-xl shadow-premium flex items-center justify-center transition-transform active:scale-90"
        aria-label="Back"
      >
        <ArrowLeft size={20} className="text-textPrimary" />
      </button>

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
            <div className="max-w-md mx-auto bg-surface/95 backdrop-blur-xl shadow-premium-lg rounded-[28px] p-5 pointer-events-auto">
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
                    <span className="font-extrabold text-[22px] leading-none text-primary">{route.durationText}</span>
                    <span className="text-[13px] font-medium text-textSecondary mt-1">{route.distanceText}</span>
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

              {/* Arrival time */}
              <AnimatePresence>
                {arrivalTime && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-1.5 mt-3 mb-1 px-1"
                  >
                    <Clock size={14} className="text-textSecondary" />
                    <span className="text-[13px] font-semibold text-textPrimary">Arrive by {arrivalTime}</span>
                    <span className="text-[13px] text-textSecondary">· fastest route</span>
                  </motion.div>
                )}
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

                <button
                  onClick={() => navigate(-1)}
                  className="flex-1 h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-glow-primary text-white"
                  style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})` }}
                >
                  <Navigation size={20} fill="white" />
                  End Route
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
