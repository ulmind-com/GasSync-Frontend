import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Bell, TrendingDown, TrendingUp, BarChart2, Map, Users, Camera, ThumbsUp, ThumbsDown, ChevronDown, ChevronRight, Star, Navigation, User, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/axios';
import { fetchNearbyGasStations, getPhotoUrl, calculateDistanceMiles } from '../lib/overpass';
import type { GasStationPlace } from '../lib/overpass';
import { useLocationStore } from '../store/locationStore';
import { useAuthStore } from '../store/authStore';

// ─── Types ────────────────────────────────────────────────
interface StationWithPrices {
  station: GasStationPlace;
  fuelPrices: { type: string; price: number; currencyCode: string; updateTime: string }[];
  communityPrices: any[];
}

const FUEL_LABEL: Record<string, string> = {
  REGULAR_UNLEADED: 'Regular', MIDGRADE: 'Midgrade',
  PREMIUM: 'Premium', DIESEL: 'Diesel', E85: 'E85',
};

const FUEL_COLOR: Record<string, string> = {
  REGULAR_UNLEADED: '#34C759', MIDGRADE: '#208AEF',
  PREMIUM: '#AF52DE', DIESEL: '#FF9500', E85: '#FF3B30',
};

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'market' | 'community'>('market');

  const { lat, lon, name: locationName, setLocation, radiusMiles } = useLocationStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (lat !== null) return;
    
    // Simulate location fetching for Web (In reality, would use navigator.geolocation)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Very simplified reverse geocoding fallback for web
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`);
            const data = await res.json();
            // Use the full display name instead of trying to parse out just the city
            const fullLocation = data.display_name || 'Unknown Location';
            setLocation(position.coords.latitude, position.coords.longitude, fullLocation);
          } catch (e) {
            setLocation(position.coords.latitude, position.coords.longitude, 'Location Found');
          }
        },
        () => {
          setLocation(29.7604, -95.3698, 'Houston, TX');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocation(29.7604, -95.3698, 'Houston, TX');
    }
  }, [lat, setLocation]);

  // 1. Fetch nearby stations
  const { data: nearbyStations, isLoading: stationsLoading } = useQuery({
    queryKey: ['home-nearby', lat ? Math.round(lat * 500) / 500 : null, lon ? Math.round(lon * 500) / 500 : null, radiusMiles],
    queryFn: () => fetchNearbyGasStations(lat!, lon!, radiusMiles * 1609.34),
    enabled: !!lat,
  });

  const stations = useMemo(() => {
    const raw = nearbyStations || [];
    if (!lat || !lon) return raw;
    return [...raw].sort((a, b) => calculateDistanceMiles(lat, lon, a.lat, a.lon) - calculateDistanceMiles(lat, lon, b.lat, b.lon));
  }, [nearbyStations, lat, lon]);

  // 2. Fetch prices for top 10 stations (Market Overview & Market Tab)
  const { data: stationsWithPrices, isLoading: pricesLoading } = useQuery({
    queryKey: ['home-station-prices', stations.slice(0, 10).map(s => s.id).sort().join(',')],
    queryFn: async (): Promise<StationWithPrices[]> => {
      const toFetch = stations.slice(0, 10);
      if (toFetch.length === 0) return [];

      const results = await Promise.allSettled(
        toFetch.map(s => api.get(`/prices/by-place/${s.id}`).then(r => ({
          station: s,
          fuelPrices: r.data?.data?.fuelPrices || [],
          communityPrices: r.data?.data?.communityPrices || [],
        })))
      );

      return results
        .filter((r): r is PromiseFulfilledResult<StationWithPrices> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(r => r.fuelPrices.length > 0 || r.communityPrices.length > 0);
    },
    enabled: stations.length > 0,
    refetchInterval: 15000,
  });

  // 3. Compute Lowest, Highest, Average from real data
  const priceStats = useMemo(() => {
    if (!stationsWithPrices || stationsWithPrices.length === 0) return null;

    let lowestPrice = Infinity;
    let highestPrice = -Infinity;
    let lowestStation = null as StationWithPrices | null;
    let highestStation = null as StationWithPrices | null;
    const allRegularPrices: number[] = [];
    const fuelTotals: Record<string, { sum: number; count: number }> = {};

    stationsWithPrices.forEach(sp => {
      sp.fuelPrices.forEach(fp => {
        if (fp.price > 0) {
          if (!fuelTotals[fp.type]) fuelTotals[fp.type] = { sum: 0, count: 0 };
          fuelTotals[fp.type].sum += fp.price;
          fuelTotals[fp.type].count += 1;
        }
      });

      const regularPrice = sp.fuelPrices.find(fp => fp.type === 'REGULAR_UNLEADED')?.price || sp.fuelPrices[0]?.price || 0;

      if (regularPrice > 0) {
        allRegularPrices.push(regularPrice);
        if (regularPrice < lowestPrice) {
          lowestPrice = regularPrice;
          lowestStation = sp;
        }
        if (regularPrice > highestPrice) {
          highestPrice = regularPrice;
          highestStation = sp;
        }
      }
    });

    const avgPrice = allRegularPrices.length > 0 ? allRegularPrices.reduce((a, b) => a + b, 0) / allRegularPrices.length : 0;
    const fuelBreakdown = Object.entries(fuelTotals).map(([type, data]) => ({
      type, label: FUEL_LABEL[type] || type, color: FUEL_COLOR[type] || '#9E9E9E', avgPrice: data.sum / data.count,
    }));

    return { lowestPrice, highestPrice, lowestStation, highestStation, avgPrice, fuelBreakdown };
  }, [stationsWithPrices]);

  // 3b. Fetch community prices SEPARATELY via nearby spatial endpoint
  const { data: allCommunityPricesData, isLoading: communityPricesLoading } = useQuery({
    queryKey: ['home-community-nearby', lat ? Math.round(lat * 500) / 500 : null, lon ? Math.round(lon * 500) / 500 : null, radiusMiles],
    queryFn: async () => {
      if (!lat || !lon) return [];
      const res = await api.get(`/prices/community/nearby?lat=${lat}&lng=${lon}&radiusMiles=${radiusMiles}&limit=50`);
      return res.data?.data || [];
    },
    enabled: !!lat && !!lon,
    refetchInterval: 15000,
  });

  const allCommunityPrices = allCommunityPricesData || [];

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Recently';
    const day = d.getDate();
    const getSuffix = (n: number) => {
      if (n >= 11 && n <= 13) return 'th';
      switch (n % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
    };
    const month = d.toLocaleString('en-US', { month: 'long' });
    const year = d.getFullYear();
    return `${day}${getSuffix(day)} ${month} ${year}`;
  };

  const voteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'helpful' | 'not-helpful' }) => {
      const res = await api.post(`/bills/${id}/${type}`);
      return res.data;
    },
    onMutate: async ({ id, type }) => {
      await queryClient.cancelQueries({ queryKey: ['home-station-prices'] });
      
      queryClient.setQueriesData({ queryKey: ['home-station-prices'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((station: any) => ({
          ...station,
          communityPrices: station.communityPrices.map((cp: any) => {
            if (cp.id === id) {
              const newCp = { ...cp };
              const userId = user?.id || user?._id;
              
              if (type === 'helpful') {
                const isHelpful = newCp.helpfulUsers?.includes(userId);
                if (isHelpful) {
                  newCp.helpfulUsers = newCp.helpfulUsers.filter((u: any) => u !== userId);
                  newCp.helpfulCount = Math.max(0, (newCp.helpfulCount || 0) - 1);
                } else {
                  newCp.helpfulUsers = [...(newCp.helpfulUsers || []), userId];
                  newCp.helpfulCount = (newCp.helpfulCount || 0) + 1;
                  newCp.notHelpfulUsers = (newCp.notHelpfulUsers || []).filter((u: any) => u !== userId);
                  newCp.notHelpfulCount = newCp.notHelpfulUsers.length;
                }
              } else {
                const isNotHelpful = newCp.notHelpfulUsers?.includes(userId);
                if (isNotHelpful) {
                  newCp.notHelpfulUsers = newCp.notHelpfulUsers.filter((u: any) => u !== userId);
                  newCp.notHelpfulCount = Math.max(0, (newCp.notHelpfulCount || 0) - 1);
                } else {
                  newCp.notHelpfulUsers = [...(newCp.notHelpfulUsers || []), userId];
                  newCp.notHelpfulCount = (newCp.notHelpfulCount || 0) + 1;
                  newCp.helpfulUsers = (newCp.helpfulUsers || []).filter((u: any) => u !== userId);
                  newCp.helpfulCount = newCp.helpfulUsers.length;
                }
              }
              return newCp;
            }
            return cp;
          })
        }));
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['home-station-prices'] });
    }
  });

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return res.data?.data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const isLoading = stationsLoading || pricesLoading;

  return (
    <div className="flex flex-col flex-1 pb-10 w-full">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-[#208AEF]/10 to-transparent -z-10" />

      <div className="pt-6">
        {/* ─── Header ─── */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">{t('profile.location')}</p>
            <button 
              onClick={() => navigate('/location-search')}
              className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-gray-100 px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all hover:bg-white group"
            >
              <MapPin size={18} className="text-[#34C759]" />
              <span className="font-semibold text-lg text-gray-900">{locationName}</span>
              <ChevronDown size={18} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
            </button>
          </div>
        </div>

        {/* ─── Price Stats Card ─── */}
        <div className="mb-8">
          <h2 className="font-bold text-xl text-gray-900 mb-4">Market Overview</h2>
          {isLoading ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[150px] border border-gray-100">
              <div className="w-8 h-8 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
              <p className="font-medium text-sm text-gray-500 mt-3">{t('home.fetchingPrices')}</p>
            </div>
          ) : priceStats?.lowestStation ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Lowest Price */}
              <button onClick={() => navigate(`/station/${priceStats.lowestStation!.station.id}`)} className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col text-left group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#E8F8EC] group-hover:scale-105 transition-transform">
                    <TrendingDown size={22} className="text-[#34C759]" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-500 uppercase tracking-wider">{t('home.lowestNearYou')}</p>
                    <p className="font-bold text-sm text-gray-900 mt-0.5 truncate">{priceStats.lowestStation.station.name}</p>
                  </div>
                </div>
                <div className="flex justify-between items-end mt-auto">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-3xl text-gray-900 tracking-tight">${priceStats.lowestPrice.toFixed(2)}</span>
                    <span className="font-medium text-sm text-gray-500">{t('home.perGal')}</span>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-[#34C759] group-hover:translate-x-1 transition-all" />
                </div>
              </button>

              {/* Highest Price */}
              <button onClick={() => navigate(`/station/${priceStats.highestStation!.station.id}`)} className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col text-left group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#FFF0E6] group-hover:scale-105 transition-transform">
                    <TrendingUp size={22} className="text-[#FF6B00]" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-500 uppercase tracking-wider">{t('home.highestNearYou')}</p>
                    <p className="font-bold text-sm text-gray-900 mt-0.5 truncate">{priceStats.highestStation!.station.name}</p>
                  </div>
                </div>
                <div className="flex justify-between items-end mt-auto">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-3xl text-gray-900 tracking-tight">${priceStats.highestPrice.toFixed(2)}</span>
                    <span className="font-medium text-sm text-gray-500">{t('home.perGal')}</span>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-[#FF6B00] group-hover:translate-x-1 transition-all" />
                </div>
              </button>

              {/* Average */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#F3F4F6]">
                    <BarChart2 size={22} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-500 uppercase tracking-wider">{t('home.localAverage')}</p>
                    <p className="font-bold text-sm text-gray-500 mt-0.5">{stationsWithPrices?.length || 0} {t('home.stationsAnalyzed')}</p>
                  </div>
                </div>
                <div className="flex justify-between items-end mt-auto">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-3xl text-gray-900 tracking-tight">${priceStats.avgPrice.toFixed(2)}</span>
                    <span className="font-medium text-sm text-gray-500">{t('home.perGal')}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[150px]">
              <MapPin size={28} className="text-gray-300" />
              <p className="font-medium text-sm text-gray-500 mt-2">{t('home.noPriceData')}</p>
            </div>
          )}
        </div>

        {/* ─── Fuel Type Breakdown Pills ─── */}
        {priceStats?.fuelBreakdown && priceStats.fuelBreakdown.length > 0 && (
          <div className="mb-8">
            <h2 className="font-bold text-lg text-gray-900 mb-3">Average by Fuel Type</h2>
            <div className="flex flex-wrap gap-3">
              {priceStats.fuelBreakdown.map((fuel) => (
                <div key={fuel.type} className="bg-white rounded-xl px-4 py-2 flex items-center gap-2 border border-gray-100 shadow-sm">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fuel.color }} />
                  <span className="font-medium text-sm text-gray-600">{fuel.label}</span>
                  <span className="font-bold text-[15px] text-gray-900 ml-1">${fuel.avgPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Tabs: Market / Community ─── */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
          <button
            onClick={() => setActiveTab('market')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl transition-all ${activeTab === 'market' ? 'bg-white shadow-sm text-gray-900 font-semibold' : 'text-gray-500 font-medium'}`}
          >
            <Map size={15} className={activeTab === 'market' ? 'text-[#34C759]' : 'text-gray-500'} />
            <span className="text-sm">{t('home.market')}</span>
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl transition-all ${activeTab === 'community' ? 'bg-white shadow-sm text-gray-900 font-semibold' : 'text-gray-500 font-medium'}`}
          >
            <Users size={15} className={activeTab === 'community' ? 'text-[#34C759]' : 'text-gray-500'} />
            <span className="text-sm">
              {t('home.community')} {allCommunityPrices.length > 0 ? `(${allCommunityPrices.length})` : ''}
            </span>
          </button>
        </div>

        {/* ─── Tab Content ─── */}
        {activeTab === 'market' ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl text-gray-900">{t('home.gasStations')}</h2>
              <button onClick={() => navigate('/station/all')} className="font-semibold text-sm text-[#34C759]">See all</button>
            </div>

            {stationsLoading ? (
              <div className="flex justify-center mt-10">
                <div className="w-8 h-8 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {stations.slice(0, 10).map((item) => {
                  const sp = stationsWithPrices?.find(s => s.station.id === item.id);
                  const regularPrice = sp?.fuelPrices?.find(fp => fp.type === 'REGULAR_UNLEADED')?.price || sp?.fuelPrices?.[0]?.price;

                  return (
                    <button key={item.id} onClick={() => navigate(`/station/${item.id}`)} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100 text-left flex flex-col group">
                      <div className="w-full h-40 bg-gray-100 relative flex items-center justify-center overflow-hidden">
                        {item.photoRef ? (
                          <img src={getPhotoUrl(item.photoRef, 400)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <MapPin size={32} className="text-[#34C759]" />
                        )}
                        {regularPrice && (
                          <div className="absolute top-3 right-3 bg-black/70 px-3 py-1.5 rounded-lg backdrop-blur-md">
                            <span className="font-bold text-sm text-white">${regularPrice.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-base text-gray-900 truncate mb-1">{item.name}</h3>
                        {item.address && <p className="font-medium text-xs text-gray-500 truncate mb-3">{item.address}</p>}
                        <div className="flex items-center gap-2 mt-auto">
                          <div className="flex items-center bg-[#FFF8E6] px-2 py-1 rounded-md">
                            <Star size={12} className="text-[#FFB800] fill-[#FFB800] mr-1" />
                            <span className="font-bold text-xs text-[#B38000]">{item.rating > 0 ? item.rating.toFixed(1) : 'New'}</span>
                          </div>
                          {item.totalRatings > 0 && <span className="font-medium text-xs text-gray-400">({item.totalRatings})</span>}
                          <div className="flex items-center text-gray-400 ml-auto">
                            <Navigation size={12} className="mr-1" />
                            <span className="font-medium text-xs">Nearby</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center mt-10 gap-3">
                <MapPin size={28} className="text-gray-300" />
                <p className="font-medium text-[15px] text-gray-500 text-center">
                  {lat ? 'No stations found nearby' : 'Getting your location...'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl text-gray-900">{t('home.communityReports')}</h2>
            </div>
            
            {communityPricesLoading ? (
              <div className="flex flex-col items-center justify-center mt-10 gap-3">
                <Loader2 size={32} className="text-[#34C759] animate-spin" />
                <p className="font-medium text-[15px] text-gray-500 text-center">Loading community reports...</p>
              </div>
            ) : allCommunityPrices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allCommunityPrices.map((cp: any, idx: number) => (
                  <button key={idx} onClick={() => navigate(`/station/${cp.stationId}`)} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100 text-left flex flex-col w-full group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {cp.reportedByAvatar ? (
                          <img src={cp.reportedByAvatar} alt={cp.reportedBy} className="w-12 h-12 rounded-full object-cover border border-gray-100" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E8F8EC] to-[#D5F3E0] flex items-center justify-center border border-gray-100">
                            <User size={18} className="text-[#34C759]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">{cp.reportedBy}</p>
                          <p className="font-medium text-xs text-gray-500 truncate mt-0.5">{cp.stationName}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-end justify-between bg-gray-50 p-4 rounded-xl mb-4">
                      <div>
                        <span className="font-medium text-[11px] text-gray-500 uppercase tracking-wider mb-1 block">Reported Price</span>
                        <div className="bg-[#E8F8EC] px-2.5 py-1 rounded-md inline-block">
                          <span className="font-bold text-xs text-[#34C759] capitalize">{cp.fuelType || 'regular'}</span>
                        </div>
                      </div>
                      <span className="font-bold text-3xl text-gray-900 tracking-tight">${cp.price?.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-1.5">
                        <Camera size={14} className="text-gray-400" />
                        <span className="font-medium text-[12px] text-gray-500">{formatDate(cp.billDate)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          className="flex items-center gap-1.5 transition-transform hover:scale-110" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) return alert(t('common.loginRequired'));
                            voteMutation.mutate({ id: cp.id, type: 'helpful' });
                          }}
                        >
                          <ThumbsUp size={16} className={cp.helpfulUsers?.includes(user?._id || user?.id) ? 'text-[#34C759]' : 'text-gray-400'} />
                          <span className={`text-sm font-semibold ${cp.helpfulUsers?.includes(user?._id || user?.id) ? 'text-[#34C759]' : 'text-gray-500'}`}>{cp.helpfulCount || 0}</span>
                        </button>
                        <button 
                          className="flex items-center gap-1.5 transition-transform hover:scale-110" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) return alert(t('common.loginRequired'));
                            voteMutation.mutate({ id: cp.id, type: 'not-helpful' });
                          }}
                        >
                          <ThumbsDown size={16} className={cp.notHelpfulUsers?.includes(user?._id || user?.id) ? 'text-[#FF3B30]' : 'text-gray-400'} />
                          <span className={`text-sm font-semibold ${cp.notHelpfulUsers?.includes(user?._id || user?.id) ? 'text-[#FF3B30]' : 'text-gray-500'}`}>{cp.notHelpfulCount || 0}</span>
                        </button>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center mt-10 gap-3">
                <Users size={32} className="text-gray-300" />
                <p className="font-medium text-[15px] text-gray-500 text-center">{t('station.noReports')}</p>
                <button onClick={() => navigate('/map')} className="flex items-center gap-2 bg-[#E8F8EC] px-5 py-3 rounded-full mt-1 hover:bg-[#d4f2dc] transition-colors">
                  <Map size={14} className="text-[#34C759]" />
                  <span className="font-semibold text-sm text-[#34C759]">{t('home.exploreMap')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
