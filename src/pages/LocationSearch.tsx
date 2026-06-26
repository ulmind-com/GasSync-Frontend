import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, MapPin } from 'lucide-react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
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
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "poi.park", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1b1b1b" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#373737" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
  { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#4e4e4e" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] }
];

const GOOGLE_API_KEY = "AIzaSyCe6KCXl5MO1INT16N9I_kiMwXxwZHJc8o";
const MAPS_API_BASE = '/maps-api';

type Prediction = {
  description: string;
  place_id: string;
};

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

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || GOOGLE_API_KEY
  });

  useEffect(() => {
    if (searchQuery.length > 2) {
      const delayDebounceFn = setTimeout(() => {
        fetchPredictions(searchQuery);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setPredictions([]);
    }
  }, [searchQuery]);

  const fetchPredictions = async (query: string) => {
    setIsSearching(true);
    try {
      const url = `${MAPS_API_BASE}/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.predictions) {
        setPredictions(json.predictions);
      }
    } catch (e) {
      console.log('Autocomplete error:', e);
    }
    setIsSearching(false);
  };

  const handleSelectPlace = async (prediction: Prediction) => {
    setPredictions([]);
    setSearchQuery(prediction.description);

    try {
      const url = `${MAPS_API_BASE}/geocode/json?address=${encodeURIComponent(prediction.description)}&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      
      if (json.results && json.results.length > 0) {
        const { lat, lng } = json.results[0].geometry.location;
        setTempLat(lat);
        setTempLon(lng);
        mapInstance?.panTo({ lat, lng });
        mapInstance?.setZoom(15);
      }
    } catch (e) {
      console.log('Geocode error:', e);
    }
  };

  const handleConfirmLocation = async () => {
    try {
      const url = `${MAPS_API_BASE}/geocode/json?latlng=${tempLat},${tempLon}&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      
      let cityName = 'Unknown Location';
      if (json.results && json.results.length > 0) {
        // Use the full formatted address instead of trying to parse out city/state
        // This ensures the user sees exactly what they searched for
        cityName = json.results[0].formatted_address;
      }
      
      setLocation(tempLat, tempLon, cityName);
      navigate(-1);
    } catch {
      setLocation(tempLat, tempLon, 'Unknown Location');
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full relative bg-[#F8FAFC]">
      {/* Map Background */}
      <div className="absolute inset-0 z-0 bg-[#E8E8E8]">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={{ lat: tempLat, lng: tempLon }}
            zoom={12}
            onLoad={setMapInstance}
            options={{
              disableDefaultUI: true,
              styles: isDark ? darkMapStyle : [],
            }}
            onClick={(e) => {
              if (e.latLng) {
                setTempLat(e.latLng.lat());
                setTempLon(e.latLng.lng());
              }
            }}
          >
            <Marker position={{ lat: tempLat, lng: tempLon }} />
          </GoogleMap>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Header Overlay */}
      <div className="relative z-10 w-full pt-6 pb-4 px-4 bg-white/90 backdrop-blur-md shadow-sm flex flex-col gap-3 rounded-b-2xl">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-3 flex-1 flex items-center bg-gray-100 rounded-xl px-4 py-3">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="text"
              className="bg-transparent border-none outline-none w-full ml-3 text-[15px] text-gray-800 placeholder-gray-400"
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {isSearching && (
              <div className="w-4 h-4 border-2 border-[#34C759] border-t-transparent rounded-full animate-spin shrink-0"></div>
            )}
          </div>
        </div>

        {/* Autocomplete Suggestions */}
        {predictions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg mt-1 max-h-[300px] overflow-y-auto border border-gray-100">
            {predictions.map((item) => (
              <button
                key={item.place_id}
                onClick={() => handleSelectPlace(item)}
                className="w-full text-left px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 flex items-center transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#E8F8EC] flex items-center justify-center shrink-0 mr-3">
                  <MapPin size={16} className="text-[#34C759]" />
                </div>
                <span className="text-[14px] text-gray-700 truncate">{item.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Button */}
      <div className="absolute bottom-[90px] left-0 right-0 px-4 z-10">
        <button
          onClick={handleConfirmLocation}
          className="w-full bg-[#34C759] text-white rounded-full py-4 font-semibold text-[16px] shadow-lg shadow-[#34C759]/30 hover:bg-[#2EB850] active:scale-[0.98] transition-all"
        >
          Set Live Location
        </button>
      </div>
    </div>
  );
}
