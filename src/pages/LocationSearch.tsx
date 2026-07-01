import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, MapPin } from 'lucide-react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useLocationStore } from '../store/locationStore';
import { useThemeStore } from '../store/themeStore';
import { buildShortAddress } from '../lib/overpass';

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
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#373737" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] }
];

const GOOGLE_API_KEY = "AIzaSyCe6KCXl5MO1INT16N9I_kiMwXxwZHJc8o";

type Prediction = { description: string; place_id: string; lat: number; lon: number; };

export default function LocationSearch() {
  const navigate = useNavigate();
  const { lat, lon, setLocation } = useLocationStore();
  const { isDark } = useThemeStore();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tempLat, setTempLat] = useState(lat || 29.7604);
  const [tempLon, setTempLon] = useState(lon || -95.3698);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || GOOGLE_API_KEY });

  useEffect(() => {
    if (searchQuery.length > 2) {
      const delayDebounceFn = setTimeout(() => fetchPredictions(searchQuery), 500);
      return () => clearTimeout(delayDebounceFn);
    } else { setPredictions([]); }
  }, [searchQuery]);

  const fetchPredictions = async (query: string) => {
    setIsSearching(true);
    try {
      // Free OpenStreetMap (Nominatim) search — returns place + lat/lon together.
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const json = await res.json();
      setPredictions((Array.isArray(json) ? json : []).map((p: any) => ({
        description: p.display_name, place_id: String(p.place_id), lat: parseFloat(p.lat), lon: parseFloat(p.lon),
      })));
    } catch (e) { console.log('Search error:', e); }
    setIsSearching(false);
  };

  const handleSelectPlace = async (prediction: Prediction) => {
    setPredictions([]); setSearchQuery(prediction.description);
    if (!isNaN(prediction.lat) && !isNaN(prediction.lon)) {
      setTempLat(prediction.lat); setTempLon(prediction.lon);
      mapInstance?.panTo({ lat: prediction.lat, lng: prediction.lon }); mapInstance?.setZoom(13);
    }
  };

  const handleConfirmLocation = async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${tempLat}&lon=${tempLon}&format=json&addressdetails=1`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const json = await res.json();
      const a = json.address || {};
      const cityName = buildShortAddress({
        houseNumber: a.house_number,
        street: a.road,
        city: a.city || a.town || a.village || a.county,
        state: a.state,
        postcode: a.postcode,
      }) || json.display_name || 'Unknown Location';
      setLocation(tempLat, tempLon, cityName); navigate(-1);
    } catch { setLocation(tempLat, tempLon, 'Unknown Location'); navigate(-1); }
  };

  return (
    <div className="flex flex-col h-screen w-full relative bg-background">
      <div className="absolute inset-0 z-0 bg-surfaceMuted">
        {isLoaded ? (
          <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={{ lat: tempLat, lng: tempLon }} zoom={12} onLoad={setMapInstance}
            options={{ disableDefaultUI: true, styles: isDark ? darkMapStyle : [] }}
            onClick={(e) => { if (e.latLng) { setTempLat(e.latLng.lat()); setTempLon(e.latLng.lng()); } }}
          >
            <Marker position={{ lat: tempLat, lng: tempLon }} />
          </GoogleMap>
        ) : (
          <div className="w-full h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        )}
      </div>

      {/* Header Overlay */}
      <div className="relative z-10 w-full pt-6 pb-4 px-4 glass shadow-glass-sm flex flex-col gap-3 rounded-b-2xl">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface shadow-sm flex items-center justify-center text-textSecondary hover:bg-surfaceMuted transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="ml-3 flex-1 premium-input flex items-center px-4 py-3">
            <Search size={18} className="text-textMuted shrink-0" />
            <input type="text" className="bg-transparent border-none outline-none w-full ml-3 text-[15px] text-textPrimary placeholder-textMuted" placeholder="Search location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
            {isSearching && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"></div>}
          </div>
        </div>

        {predictions.length > 0 && (
          <div data-lenis-prevent className="premium-modal shadow-premium-lg mt-1 max-h-[300px] overflow-y-auto overscroll-contain">
            {predictions.map((item) => (
              <button key={item.place_id} onClick={() => handleSelectPlace(item)} className="w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-surfaceMuted flex items-center transition-colors">
                <div className="w-8 h-8 rounded-full bg-avatarBg flex items-center justify-center shrink-0 mr-3"><MapPin size={16} className="text-primary" /></div>
                <span className="text-[14px] text-textSecondary truncate">{item.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-[90px] left-0 right-0 px-4 z-10">
        <button onClick={handleConfirmLocation} className="btn-primary w-full rounded-full py-4 text-[16px] shadow-glow-primary">
          Set Live Location
        </button>
      </div>
    </div>
  );
}
