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

const MAP_HEIGHT = '45vh';

// Default Map Styles for Light/Dark modes
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

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

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
          } catch (e) {
            setLocation(position.coords.latitude, position.coords.longitude, 'Location Found');
          }
        },
        () => {
          setLocation(29.7604, -95.3698, 'Houston, TX');
        }
      );
    } else {
      setLocation(29.7604, -95.3698, 'Houston, TX');
    }
  }, [lat, setLocation]);

  useEffect(() => {
    if (lat !== null && lon !== null && map) {
      const getZoomForRadius = (radius: number) => {
        if (radius <= 1) return 14;
        if (radius <= 5) return 12;
        if (radius <= 10) return 11;
        if (radius <= 20) return 10;
        return 9;
      };
      map.setZoom(getZoomForRadius(radiusMiles));
      map.panTo({ lat, lng: lon });
    }
  }, [lat, lon, radiusMiles, map]);

  const { data: nearbyStations, isLoading: stationsLoading } = useQuery({
    queryKey: ['map-nearby', lat, lon, radiusMiles],
    queryFn: () => fetchNearbyGasStations(lat!, lon!, radiusMiles * 1609.34),
    enabled: !!lat,
    staleTime: 60000,
  });

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (text.length < 2) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setShowSearchResults(true);
    if (nearbyStations) {
      const filtered = nearbyStations.filter(s => s.name.toLowerCase().includes(text.toLowerCase()));
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [nearbyStations]);

  const handleSelectSearchResult = (station: GasStationPlace) => {
    setShowSearchResults(false);
    setSearchQuery(station.name);
    setSelectedStation(station);
    if (map) {
      map.panTo({ lat: station.lat, lng: station.lon });
      map.setZoom(15);
    }
  };

  const stations = useMemo(() => {
    const raw = nearbyStations || [];
    if (!lat || !lon) return raw;
    let filtered = [...raw];

    if (activeFilter === 'open') {
      filtered = filtered.filter(s => s.isOpen);
    } else if (activeFilter === 'top_rated') {
      filtered = filtered.filter(s => s.rating && s.rating >= 4.0);
    }
    if (activeFilter === 'car_wash') {
      filtered = filtered.filter(s => s.types && s.types.includes('car_wash'));
    }

    return filtered.sort((a, b) => calculateDistanceMiles(lat, lon, a.lat, a.lon) - calculateDistanceMiles(lat, lon, b.lat, b.lon));
  }, [nearbyStations, lat, lon, activeFilter]);

  if (lat === null || !isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
        <p className="font-medium text-gray-500 mt-4">Getting your location...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative">
      {/* Left Panel: Search & List (Desktop) / Top Panel (Mobile) */}
      <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col h-full bg-white z-10 shrink-0 border-r border-gray-100">
        {/* Header & Search */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 hover:bg-gray-50 rounded-full flex items-center justify-center text-gray-600 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-bold text-lg text-gray-900">{t('map.title')}</h1>
            <button onClick={() => setFilterModalVisible(true)} className="relative w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-800 transition-colors">
              <Sliders size={18} className={activeFilter !== 'all' ? "text-[#34C759]" : ""} />
              {activeFilter !== 'all' && <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#34C759] rounded-full border border-white" />}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="flex items-center bg-gray-50 rounded-xl px-4 h-12 border border-gray-100 focus-within:border-[#34C759] focus-within:ring-1 focus-within:ring-[#34C759] transition-all">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                className="flex-1 bg-transparent outline-none ml-3 font-medium text-sm text-gray-900 placeholder:text-gray-400"
                placeholder={t('map.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
        {showSearchResults && (
          <div className="absolute top-[60px] left-5 right-5 bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-h-[250px] overflow-y-auto border border-gray-100 z-50">
            {searchResults.length > 0 ? (
              searchResults.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 text-left"
                  onClick={() => handleSelectSearchResult(item)}
                >
                  <div className="w-8 h-8 rounded-full bg-[#E8F8EC] flex items-center justify-center mr-3 shrink-0">
                    <MapPin size={16} className="text-[#34C759]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                    {item.address && <p className="font-normal text-[11px] text-gray-500 truncate">{item.address}</p>}
                  </div>
                </button>
              ))
            ) : (
              <p className="text-center text-[13px] text-gray-500 py-4">{t('map.noResults')}</p>
            )}
          </div>
        )}
      </div>
    </div>

      {/* Vertical List of Nearby Stations */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base text-gray-900">{t('map.nearbyStations')}</h2>
          <div className="flex items-center gap-3">
            <span className="font-medium text-xs text-gray-500">{stations.length} stations</span>
            <button 
              onClick={() => navigate('/station/all')}
              className="font-semibold text-[13px] text-[#34C759] hover:text-[#2EB350] transition-colors"
            >
              See All
            </button>
          </div>
        </div>

        {stationsLoading ? (
          <div className="flex justify-center mt-8">
            <div className="w-6 h-6 border-2 border-[#34C759] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stations.length > 0 ? (
          <div className="flex flex-col gap-3">
            {stations.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/station/${item.id}`)}
                className={`bg-white rounded-xl p-3 text-left flex gap-3 transition-all border ${
                  selectedStation?.id === item.id ? 'border-[#34C759] shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
                }`}
              >
                <div className="w-[100px] h-[80px] bg-gray-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                  {item.photoRef ? (
                    <img src={getPhotoUrl(item.photoRef, 200)} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <MapPin size={20} className="text-[#34C759]" />
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900 truncate">{item.name}</h3>
                  {item.address && <p className="font-medium text-[11px] text-gray-500 truncate mt-0.5">{item.address}</p>}
                  
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <div className="flex items-center">
                      <Star size={10} className="text-[#FFB800] fill-[#FFB800] mr-1" />
                      <span className="font-bold text-[11px] text-gray-700">{item.rating > 0 ? item.rating.toFixed(1) : 'New'}</span>
                      {item.totalRatings > 0 && <span className="font-medium text-[10px] text-gray-400 ml-0.5">({item.totalRatings})</span>}
                    </div>
                    <span className="text-gray-300 text-[10px]">•</span>
                    <span className="font-medium text-[11px] text-gray-500">
                      {calculateDistanceMiles(lat!, lon!, item.lat, item.lon).toFixed(1)} mi
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center mt-10 opacity-60">
            <MapPin size={24} className="text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">No stations found.</p>
          </div>
        )}
      </div>
    </div>

    {/* Map Section (Right side on Desktop) */}
    <div className="flex-1 h-[40vh] md:h-full relative bg-gray-100 border-l border-gray-100">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={{ lat: lat ?? 29.7604, lng: lon ?? -95.3698 }}
        zoom={12}
        onLoad={setMap}
        options={{
          disableDefaultUI: true,
          styles: isDark ? darkMapStyle : [],
        }}
      >
        {/* User Location Marker */}
        {lat !== null && lon !== null && (
          <Marker
            position={{ lat, lng: lon }}
            icon={{
              url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="%23208AEF" stroke="white" stroke-width="3"/></svg>',
              scaledSize: new google.maps.Size(24, 24),
            }}
            zIndex={999}
          />
        )}

        {stations.map((station) => (
          <Marker
            key={station.id}
            position={{ lat: station.lat, lng: station.lon }}
            onClick={() => {
              setSelectedStation(station);
              map?.panTo({ lat: station.lat, lng: station.lon });
            }}
            icon={{
              url: station.photoRef ? getPhotoUrl(station.photoRef, 100) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%2334C759"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
              scaledSize: station.photoRef ? new google.maps.Size(40, 30) : new google.maps.Size(32, 32),
            }}
          />
        ))}
      </GoogleMap>

      {/* Recenter Button */}
      <button 
        onClick={() => {
          if (lat !== null && lon !== null && map) {
            const getZoomForRadius = (radius: number) => {
              if (radius <= 1) return 14;
              if (radius <= 5) return 12;
              if (radius <= 10) return 11;
              if (radius <= 20) return 10;
              return 9;
            };
            map.setZoom(getZoomForRadius(radiusMiles));
            map.panTo({ lat, lng: lon });
          }
        }}
        className="absolute top-6 right-6 w-12 h-12 bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center text-gray-700 hover:text-[#208AEF] hover:bg-gray-50 transition-colors z-10"
      >
        <LocateFixed size={20} />
      </button>

      {/* Selected Station Modal (Desktop Floating Card) */}
      {selectedStation && (
        <div className="absolute bottom-6 right-6 w-full max-w-[340px] bg-white rounded-2xl p-5 shadow-2xl z-20 transform transition-all duration-300 border border-gray-100">
          <div className="flex justify-between items-start">
            <h2 className="font-bold text-lg text-gray-900 pr-8 leading-tight">{selectedStation.name}</h2>
            <button onClick={() => setSelectedStation(null)} className="absolute right-4 top-4 p-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
              <X size={16} />
            </button>
          </div>
          
          <div className="flex items-center mt-3 gap-1.5">
            <Star size={14} className="text-[#FFB800] fill-[#FFB800]" />
            <span className="font-medium text-[13px] text-gray-900">
              {selectedStation.rating > 0 ? selectedStation.rating.toFixed(1) : t('common.new')}
            </span>
            {selectedStation.totalRatings > 0 && (
              <span className="font-normal text-[13px] text-gray-500">
                ({selectedStation.totalRatings} {t('common.ratings')})
              </span>
            )}
          </div>
          
          {selectedStation.address && (
            <div className="flex items-start gap-2 mt-3 text-gray-500 bg-gray-50 p-2.5 rounded-lg">
              <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
              <p className="font-medium text-[13px] leading-snug">{selectedStation.address}</p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button 
              onClick={() => navigate(`/navigate/${selectedStation.id}`)}
              className="flex-1 bg-[#208AEF] hover:bg-[#1C7AD6] transition-colors text-white flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm shadow-sm"
            >
              <Navigation size={16} />
              Navigate
            </button>
            <button 
              onClick={() => navigate(`/scanner?googlePlaceId=${selectedStation.id}&stationName=${encodeURIComponent(selectedStation.name || '')}`)}
              className="flex-1 bg-[#34C759] hover:bg-[#2EB350] transition-colors text-white flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm shadow-sm"
            >
              <List size={16} />
              Report Price
            </button>
          </div>
        </div>
      )}

      {/* Filter Modal Overlay */}
      {filterModalVisible && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-end justify-center sm:items-center">
          <div className="bg-white w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl p-5 pb-10 sm:pb-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-xl text-gray-900">Filter Stations</h2>
              <button onClick={() => setFilterModalVisible(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base text-gray-900 mb-3">Search Radius</h3>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[1, 5, 10, 20, 50].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap border transition-colors ${radiusMiles === r ? 'bg-[#E8F8EC] border-[#34C759] text-[#34C759]' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                      {r} miles
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-px bg-gray-200 w-full my-4" />
              
              <div>
                <h3 className="font-semibold text-base text-gray-900 mb-3">Station Features</h3>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { setFilter('all'); setFilterModalVisible(false); }} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${activeFilter === 'all' ? 'border-[#34C759] bg-[#E8F8EC]' : 'border-gray-200 bg-white'}`}>
                    <List size={18} className={activeFilter === 'all' ? "text-[#34C759]" : "text-gray-400"} />
                    <span className={`font-medium text-sm flex-1 text-left ${activeFilter === 'all' ? "text-[#34C759]" : "text-gray-600"}`}>All Stations</span>
                    {activeFilter === 'all' && <Check size={18} className="text-[#34C759]" />}
                  </button>
                  <button onClick={() => { setFilter('open'); setFilterModalVisible(false); }} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${activeFilter === 'open' ? 'border-[#34C759] bg-[#E8F8EC]' : 'border-gray-200 bg-white'}`}>
                    <Clock size={18} className={activeFilter === 'open' ? "text-[#34C759]" : "text-gray-400"} />
                    <span className={`font-medium text-sm flex-1 text-left ${activeFilter === 'open' ? "text-[#34C759]" : "text-gray-600"}`}>Open Now</span>
                    {activeFilter === 'open' && <Check size={18} className="text-[#34C759]" />}
                  </button>
                  <button onClick={() => { setFilter('top_rated'); setFilterModalVisible(false); }} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${activeFilter === 'top_rated' ? 'border-[#34C759] bg-[#E8F8EC]' : 'border-gray-200 bg-white'}`}>
                    <Star size={18} className={activeFilter === 'top_rated' ? "text-[#34C759]" : "text-gray-400"} />
                    <span className={`font-medium text-sm flex-1 text-left ${activeFilter === 'top_rated' ? "text-[#34C759]" : "text-gray-600"}`}>Top Rated (4.0+)</span>
                    {activeFilter === 'top_rated' && <Check size={18} className="text-[#34C759]" />}
                  </button>
                  <button onClick={() => { setFilter('car_wash'); setFilterModalVisible(false); }} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${activeFilter === 'car_wash' ? 'border-[#34C759] bg-[#E8F8EC]' : 'border-gray-200 bg-white'}`}>
                    <Droplet size={18} className={activeFilter === 'car_wash' ? "text-[#34C759]" : "text-gray-400"} />
                    <span className={`font-medium text-sm flex-1 text-left ${activeFilter === 'car_wash' ? "text-[#34C759]" : "text-gray-600"}`}>Has Car Wash</span>
                    {activeFilter === 'car_wash' && <Check size={18} className="text-[#34C759]" />}
                  </button>
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
