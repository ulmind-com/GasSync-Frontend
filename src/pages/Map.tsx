import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search, Sliders, ArrowLeft, Star, Navigation, List, X, LocateFixed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchNearbyGasStations, searchGasStations, getPhotoUrl, calculateDistanceMiles } from '../lib/overpass';
import { resolveUserLocation } from '../lib/geolocation';
import type { GasStationPlace } from '../lib/overpass';
import { api } from '../lib/axios';
import { useLocationStore } from '../store/locationStore';
import { useThemeStore } from '../store/themeStore';
import FilterModal from '../components/FilterModal';

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

export default function MapScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { lat, lon, setLocation, radiusMiles, activeFilter, sortBy, selectedFuel } = useLocationStore();
  const { isDark } = useThemeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GasStationPlace[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStation, setSelectedStation] = useState<GasStationPlace | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCe6KCXl5MO1INT16N9I_kiMwXxwZHJc8o' });
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (lat !== null) return;

    let cancelled = false;
    resolveUserLocation().then((loc) => {
      if (cancelled) return;
      setLocation(loc.lat, loc.lon, loc.name);
    });

    return () => { cancelled = true; };
  }, [lat, setLocation]);

  useEffect(() => {
    if (lat !== null && lon !== null && map) {
      const getZoomForRadius = (radius: number) => { if (radius <= 1) return 14; if (radius <= 5) return 12; if (radius <= 10) return 11; if (radius <= 20) return 10; return 9; };
      map.setZoom(getZoomForRadius(radiusMiles));
      map.panTo({ lat, lng: lon });
    }
  }, [lat, lon, radiusMiles, map]);

  const { data: nearbyStations, isLoading: stationsLoading } = useQuery({
    queryKey: ['map-nearby', lat, lon, radiusMiles],
    queryFn: () => fetchNearbyGasStations(lat!, lon!, radiusMiles * 1609.34),
    enabled: !!lat, staleTime: 60000,
  });

  const searchSeq = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.length < 2) { setShowSearchResults(false); setSearchResults([]); setIsSearching(false); return; }
    setShowSearchResults(true);

    const norm = (v: string) => (v || '').toLowerCase().replace(/[\s,]/g, '');
    const q = norm(text);
    const local = (nearbyStations || []).filter(s => norm(s.name).includes(q) || norm(s.address).includes(q));
    setSearchResults(local);

    // Nearby list is capped (~20 closest stations). If nothing matched locally,
    // ask Google's text search directly so stations beyond that cap still show up.
    if (local.length === 0 && lat && lon) {
      setIsSearching(true);
      const seq = ++searchSeq.current;
      searchTimer.current = setTimeout(async () => {
        const remote = await searchGasStations(text, lat, lon);
        if (seq !== searchSeq.current) return; // a newer keystroke superseded this
        setSearchResults(remote);
        setIsSearching(false);
      }, 350);
    } else {
      setIsSearching(false);
    }
  }, [nearbyStations, lat, lon]);

  const handleSelectSearchResult = (station: GasStationPlace) => {
    // Match the app: tapping a search result opens that station's detail page.
    setShowSearchResults(false);
    setSearchQuery(station.name);
    navigate(`/station/${station.id}`);
  };

  const stations = useMemo(() => {
    const raw = nearbyStations || [];
    if (!lat || !lon) return raw;
    let filtered = [...raw];
    if (activeFilter === 'open') filtered = filtered.filter(s => s.isOpen);
    else if (activeFilter === 'top_rated') filtered = filtered.filter(s => s.rating && s.rating >= 4.0);
    if (activeFilter === 'car_wash') filtered = filtered.filter(s => s.types && s.types.includes('car_wash'));
    filtered = filtered.filter(s => calculateDistanceMiles(lat, lon, s.lat, s.lon) <= radiusMiles); // honor chosen radius
    return filtered.sort((a, b) => calculateDistanceMiles(lat, lon, a.lat, a.lon) - calculateDistanceMiles(lat, lon, b.lat, b.lon));
  }, [nearbyStations, lat, lon, activeFilter, radiusMiles]);

  // Fetch all fuel-type prices for the nearby stations
  const { data: stationPrices } = useQuery({
    queryKey: ['map-station-prices', stations.slice(0, 20).map(s => s.id).sort().join(',')],
    queryFn: async () => {
      const toFetch = stations.slice(0, 20);
      const results = await Promise.allSettled(
        toFetch.map(s => api.get(`/prices/by-station?name=${encodeURIComponent(s.name)}&lat=${s.lat}&lon=${s.lon}&cacheOnly=1`).then(r => {
          const fuelPrices = r.data?.data?.fuelPrices || [];
          const byType: Record<string, number> = {};
          fuelPrices.forEach((fp: any) => { if (fp.price > 0) byType[fp.type] = fp.price; });
          return { id: s.id, byType };
        }))
      );
      const map: Record<string, Record<string, number>> = {};
      results.forEach(r => { if (r.status === 'fulfilled') map[r.value.id] = r.value.byType; });
      return map;
    },
    enabled: stations.length > 0,
    refetchInterval: 15000,
  });

  // Apply price sorting (selected fuel) when chosen; otherwise keep nearby order
  const sortedStations = useMemo(() => {
    if (sortBy === 'nearby' || !stationPrices) return stations;
    return [...stations].sort((a, b) => {
      const pa = stationPrices[a.id]?.[selectedFuel] ?? null;
      const pb = stationPrices[b.id]?.[selectedFuel] ?? null;
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1;
      if (pb == null) return -1;
      return sortBy === 'price_high' ? pb - pa : pa - pb;
    });
  }, [stations, stationPrices, selectedFuel, sortBy]);

  if (lat === null || !isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-medium text-textMuted mt-4">Getting your location...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-136px)] premium-card overflow-hidden relative">
      {/* Left Panel */}
      <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col h-full bg-surface z-10 shrink-0 border-r border-border">
        <div className="p-4 border-b border-border bg-surface">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 hover:bg-surfaceMuted rounded-full flex items-center justify-center text-textSecondary transition-colors"><ArrowLeft size={20} /></button>
            <h1 className="font-bold text-lg text-textPrimary">{t('map.title')}</h1>
            {(() => {
              const filtersActive = activeFilter !== 'all' || sortBy !== 'nearby' || selectedFuel !== 'REGULAR_UNLEADED';
              return (
                <button onClick={() => setFilterModalVisible(true)} className="relative w-10 h-10 bg-surfaceMuted hover:bg-surfaceMuted/80 rounded-full flex items-center justify-center text-textPrimary transition-colors">
                  <Sliders size={18} className={filtersActive ? "text-primary" : ""} />
                  {filtersActive && <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-surface" />}
                </button>
              );
            })()}
          </div>

          <div className="relative">
            <div className="premium-input flex items-center px-4 h-12">
              <Search size={18} className="text-textMuted" />
              <input type="text" className="flex-1 bg-transparent outline-none ml-3 font-medium text-sm text-textPrimary placeholder:text-textMuted" placeholder={t('map.searchPlaceholder')} value={searchQuery} onChange={(e) => handleSearch(e.target.value)} />
            </div>
            {showSearchResults && (
              <div data-lenis-prevent className="absolute top-[60px] left-5 right-5 premium-modal shadow-premium-lg max-h-[60vh] overflow-y-auto overscroll-contain z-50">
                {searchResults.length > 0 ? (
                  searchResults.slice(0, 8).map((item) => (
                    <button key={item.id} className="w-full flex items-center px-4 py-3 border-b border-border hover:bg-surfaceMuted text-left" onClick={() => handleSelectSearchResult(item)}>
                      <div className="w-8 h-8 rounded-full bg-avatarBg flex items-center justify-center mr-3 shrink-0"><MapPin size={16} className="text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-textPrimary truncate">{item.name}</p>
                        {item.address && <p className="font-normal text-[11px] text-textMuted truncate">{item.address}</p>}
                      </div>
                    </button>
                  ))
                ) : isSearching ? (
                  <p className="text-center text-[13px] text-textMuted py-4">{t('map.searchBtn')}…</p>
                ) : ( <p className="text-center text-[13px] text-textMuted py-4">{t('map.noResults')}</p> )}
              </div>
            )}
          </div>
        </div>

        <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto bg-surfaceMuted/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base text-textPrimary">{t('map.nearbyStations')}</h2>
            <div className="flex items-center gap-3">
              <span className="font-medium text-xs text-textMuted">{stations.length} stations</span>
              <button onClick={() => navigate('/station/all')} className="font-semibold text-[13px] text-primary hover:text-primary-strong transition-colors">See All</button>
            </div>
          </div>

          {stationsLoading ? (
            <div className="flex justify-center mt-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : stations.length > 0 ? (
            <div className="flex flex-col gap-3">
              {sortedStations.map((item) => (
                <button key={item.id} onClick={() => navigate(`/station/${item.id}`)}
                  className={`premium-card p-3 text-left flex gap-3 transition-all ${selectedStation?.id === item.id ? 'border-primary shadow-md' : 'hover:shadow-md hover:border-border-strong'}`}
                >
                  <div className="w-[100px] h-[80px] bg-surfaceMuted rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                    {item.photoRef ? <img src={getPhotoUrl(item.photoRef, 200)} alt={item.name} className="w-full h-full object-cover" /> : <MapPin size={20} className="text-primary" />}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-textPrimary truncate">{item.name}</h3>
                      {stationPrices?.[item.id]?.[selectedFuel] && (
                        <span className="font-bold text-[12px] text-primary bg-avatarBg px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">${stationPrices[item.id][selectedFuel].toFixed(2)}</span>
                      )}
                    </div>
                    {item.address && <p className="font-medium text-[11px] text-textMuted truncate mt-0.5">{item.address}</p>}
                    <div className="flex items-center gap-2 mt-auto pt-2">
                      <div className="flex items-center"><Star size={10} className="text-[#FFB800] fill-[#FFB800] mr-1" /><span className="font-bold text-[11px] text-textSecondary">{item.rating > 0 ? item.rating.toFixed(1) : 'New'}</span></div>
                      <span className="text-textMuted/30 text-[10px]">•</span>
                      <span className="font-medium text-[11px] text-textMuted">{calculateDistanceMiles(lat!, lon!, item.lat, item.lon).toFixed(1)} mi</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center mt-10 opacity-60">
              <MapPin size={24} className="text-textMuted mb-2" /><p className="text-sm text-textMuted">No stations found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Map Section */}
      <div className="flex-1 h-[40vh] md:h-full relative bg-surfaceMuted border-l border-border">
        <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={{ lat: lat ?? 29.7604, lng: lon ?? -95.3698 }} zoom={12} onLoad={setMap} options={{ disableDefaultUI: true, styles: isDark ? darkMapStyle : [] }}>
          {lat !== null && lon !== null && (
            <Marker position={{ lat, lng: lon }} icon={{ url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="%23208AEF" stroke="white" stroke-width="3"/></svg>', scaledSize: new google.maps.Size(24, 24) }} zIndex={999} />
          )}
          {stations.map((station) => (
            <Marker key={station.id} position={{ lat: station.lat, lng: station.lon }} onClick={() => navigate(`/station/${station.id}`)}
              icon={{ url: station.photoRef ? getPhotoUrl(station.photoRef, 100) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%2334C759"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
                scaledSize: station.photoRef ? new google.maps.Size(40, 30) : new google.maps.Size(32, 32) }}
            />
          ))}
        </GoogleMap>

        <button onClick={() => { if (lat !== null && lon !== null && map) { const getZoomForRadius = (r: number) => { if (r <= 1) return 14; if (r <= 5) return 12; if (r <= 10) return 11; if (r <= 20) return 10; return 9; }; map.setZoom(getZoomForRadius(radiusMiles)); map.panTo({ lat, lng: lon }); } }}
          className="absolute top-6 right-6 w-12 h-12 glass rounded-full shadow-glass flex items-center justify-center text-textSecondary hover:text-info hover:bg-surfaceMuted transition-colors z-10"
        ><LocateFixed size={20} /></button>

        {selectedStation && (
          <div className="absolute bottom-6 right-6 w-full max-w-[340px] liquid-glass rounded-2xl p-5 shadow-premium-lg z-20 transform transition-all duration-300">
            <div className="flex justify-between items-start">
              <h2 className="font-bold text-lg text-textPrimary pr-8 leading-tight">{selectedStation.name}</h2>
              <button onClick={() => setSelectedStation(null)} className="absolute right-4 top-4 p-1.5 bg-surfaceMuted hover:bg-surfaceMuted/80 rounded-full text-textMuted transition-colors"><X size={16} /></button>
            </div>
            <div className="flex items-center mt-3 gap-1.5">
              <Star size={14} className="text-[#FFB800] fill-[#FFB800]" />
              <span className="font-medium text-[13px] text-textPrimary">{selectedStation.rating > 0 ? selectedStation.rating.toFixed(1) : t('common.new')}</span>
              {selectedStation.totalRatings > 0 && <span className="font-normal text-[13px] text-textMuted">({selectedStation.totalRatings} {t('common.ratings')})</span>}
            </div>
            {selectedStation.address && (
              <div className="flex items-start gap-2 mt-3 text-textMuted bg-surfaceMuted p-2.5 rounded-lg">
                <MapPin size={14} className="mt-0.5 shrink-0 text-textMuted" /><p className="font-medium text-[13px] leading-snug">{selectedStation.address}</p>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => navigate(`/navigate/${selectedStation.id}`)} className="flex-1 bg-info hover:brightness-110 transition-all text-white flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm shadow-sm"><Navigation size={16} />Navigate</button>
              <button onClick={() => navigate(`/scanner?googlePlaceId=${selectedStation.id}&stationName=${encodeURIComponent(selectedStation.name || '')}`)} className="flex-1 btn-primary py-2.5 rounded-xl text-sm"><List size={16} />Report Price</button>
            </div>
          </div>
        )}

        <FilterModal open={filterModalVisible} onClose={() => setFilterModalVisible(false)} />
      </div>
    </div>
  );
}
