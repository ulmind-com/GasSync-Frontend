import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search, Sliders, ArrowLeft, Star, Navigation, Clock, Droplet, List, Check, X, Image as ImageIcon, LocateFixed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchNearbyGasStations, getPhotoUrl, calculateDistanceMiles } from '../lib/overpass';
import type { GasStationPlace } from '../lib/overpass';
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

export default function MapScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { lat, lon, setLocation, radiusMiles, setRadius, activeFilter, setFilter } = useLocationStore();
  const { isDark } = useThemeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GasStationPlace[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedStation, setSelectedStation] = useState<GasStationPlace | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCe6KCXl5MO1INT16N9I_kiMwXxwZHJc8o' });
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (lat !== null) return;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`);
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown Location';
            setLocation(position.coords.latitude, position.coords.longitude, city);
          } catch (e) { setLocation(position.coords.latitude, position.coords.longitude, 'Location Found'); }
        },
        () => { setLocation(29.7604, -95.3698, 'Houston, TX'); }
      );
    } else { setLocation(29.7604, -95.3698, 'Houston, TX'); }
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

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (text.length < 2) { setShowSearchResults(false); setSearchResults([]); return; }
    setShowSearchResults(true);
    if (nearbyStations) setSearchResults(nearbyStations.filter(s => s.name.toLowerCase().includes(text.toLowerCase())));
    else setSearchResults([]);
  }, [nearbyStations]);

  const handleSelectSearchResult = (station: GasStationPlace) => {
    setShowSearchResults(false); setSearchQuery(station.name); setSelectedStation(station);
    if (map) { map.panTo({ lat: station.lat, lng: station.lon }); map.setZoom(15); }
  };

  const stations = useMemo(() => {
    const raw = nearbyStations || [];
    if (!lat || !lon) return raw;
    let filtered = [...raw];
    if (activeFilter === 'open') filtered = filtered.filter(s => s.isOpen);
    else if (activeFilter === 'top_rated') filtered = filtered.filter(s => s.rating && s.rating >= 4.0);
    if (activeFilter === 'car_wash') filtered = filtered.filter(s => s.types && s.types.includes('car_wash'));
    return filtered.sort((a, b) => calculateDistanceMiles(lat, lon, a.lat, a.lon) - calculateDistanceMiles(lat, lon, b.lat, b.lon));
  }, [nearbyStations, lat, lon, activeFilter]);

  if (lat === null || !isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-medium text-textMuted mt-4">Getting your location...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] premium-card overflow-hidden relative">
      {/* Left Panel */}
      <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col h-full bg-surface z-10 shrink-0 border-r border-border">
        <div className="p-4 border-b border-border bg-surface">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 hover:bg-surfaceMuted rounded-full flex items-center justify-center text-textSecondary transition-colors"><ArrowLeft size={20} /></button>
            <h1 className="font-bold text-lg text-textPrimary">{t('map.title')}</h1>
            <button onClick={() => setFilterModalVisible(true)} className="relative w-10 h-10 bg-surfaceMuted hover:bg-surfaceMuted/80 rounded-full flex items-center justify-center text-textPrimary transition-colors">
              <Sliders size={18} className={activeFilter !== 'all' ? "text-primary" : ""} />
              {activeFilter !== 'all' && <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-surface" />}
            </button>
          </div>

          <div className="relative">
            <div className="premium-input flex items-center px-4 h-12">
              <Search size={18} className="text-textMuted" />
              <input type="text" className="flex-1 bg-transparent outline-none ml-3 font-medium text-sm text-textPrimary placeholder:text-textMuted" placeholder={t('map.searchPlaceholder')} value={searchQuery} onChange={(e) => handleSearch(e.target.value)} />
            </div>
            {showSearchResults && (
              <div className="absolute top-[60px] left-5 right-5 premium-modal shadow-premium-lg max-h-[250px] overflow-y-auto z-50">
                {searchResults.length > 0 ? (
                  searchResults.slice(0, 5).map((item) => (
                    <button key={item.id} className="w-full flex items-center px-4 py-3 border-b border-border hover:bg-surfaceMuted text-left" onClick={() => handleSelectSearchResult(item)}>
                      <div className="w-8 h-8 rounded-full bg-avatarBg flex items-center justify-center mr-3 shrink-0"><MapPin size={16} className="text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-textPrimary truncate">{item.name}</p>
                        {item.address && <p className="font-normal text-[11px] text-textMuted truncate">{item.address}</p>}
                      </div>
                    </button>
                  ))
                ) : ( <p className="text-center text-[13px] text-textMuted py-4">{t('map.noResults')}</p> )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-surfaceMuted/50 p-4 shrink-0">
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
              {stations.map((item) => (
                <button key={item.id} onClick={() => navigate(`/station/${item.id}`)}
                  className={`premium-card p-3 text-left flex gap-3 transition-all ${selectedStation?.id === item.id ? 'border-primary shadow-md' : 'hover:shadow-md hover:border-border-strong'}`}
                >
                  <div className="w-[100px] h-[80px] bg-surfaceMuted rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                    {item.photoRef ? <img src={getPhotoUrl(item.photoRef, 200)} alt={item.name} className="w-full h-full object-cover" /> : <MapPin size={20} className="text-primary" />}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-textPrimary truncate">{item.name}</h3>
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
            <Marker key={station.id} position={{ lat: station.lat, lng: station.lon }} onClick={() => { setSelectedStation(station); map?.panTo({ lat: station.lat, lng: station.lon }); }}
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

        {filterModalVisible && (
          <div className="fixed inset-0 premium-modal-backdrop z-[110] flex items-end justify-center sm:items-center">
            <div className="premium-modal w-full sm:w-[400px] p-5 pb-10 sm:pb-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-xl text-textPrimary">{t('map.filterStations') || 'Filter Stations'}</h2>
                <button onClick={() => setFilterModalVisible(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surfaceMuted text-textMuted"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-base text-textPrimary mb-3">{t('map.searchRadius') || 'Search Radius'}</h3>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {[1, 5, 10, 20, 50].map((r) => (
                      <button key={r} onClick={() => setRadius(r)} className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap border transition-colors ${radiusMiles === r ? 'bg-avatarBg border-primary text-primary' : 'bg-surface border-border text-textSecondary'}`}>{r} {t('map.miles') || 'miles'}</button>
                    ))}
                  </div>
                </div>
                <div className="h-px bg-border w-full my-4" />
                <div>
                  <h3 className="font-semibold text-base text-textPrimary mb-3">{t('map.stationFeatures') || 'Station Features'}</h3>
                  <div className="flex flex-col gap-2">
                    {[
                      { key: 'all', icon: <List size={18} />, label: t('map.allStations') || 'All Stations' },
                      { key: 'open', icon: <Clock size={18} />, label: t('map.openNow') || 'Open Now' },
                      { key: 'top_rated', icon: <Star size={18} />, label: t('map.topRated') || 'Top Rated (4.0+)' },
                      { key: 'car_wash', icon: <Droplet size={18} />, label: t('map.hasCarWash') || 'Has Car Wash' },
                    ].map((f) => (
                      <button key={f.key} onClick={() => { setFilter(f.key as any); setFilterModalVisible(false); }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${activeFilter === f.key ? 'border-primary bg-avatarBg' : 'border-border bg-surface'}`}
                      >
                        <span className={activeFilter === f.key ? "text-primary" : "text-textMuted"}>{f.icon}</span>
                        <span className={`font-medium text-sm flex-1 text-left ${activeFilter === f.key ? "text-primary" : "text-textSecondary"}`}>{f.label}</span>
                        {activeFilter === f.key && <Check size={18} className="text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
