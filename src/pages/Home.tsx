import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Bell, TrendingDown, TrendingUp, BarChart2, Map, Users, Camera, ThumbsUp, ThumbsDown, ChevronDown, ChevronRight, Star, Navigation, User, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/axios';
import { fetchNearbyGasStations, getPhotoUrl, calculateDistanceMiles } from '../lib/overpass';
import { resolveUserLocation } from '../lib/geolocation';
import type { GasStationPlace } from '../lib/overpass';
import { useLocationStore } from '../store/locationStore';
import { useAuthStore } from '../store/authStore';
import { applyVoteOptimistic, rollbackVote, invalidateVoteQueries } from '../lib/voteCache';
import type { VoteType } from '../lib/voteCache';
import { useToast } from '../components/Toast';
import { TiltCard, SpotlightCard } from '../components/CursorEffects';

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
  const location = useLocation();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'market' | 'community'>('market');

  const { lat, lon, name: locationName, setLocation, radiusMiles } = useLocationStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (lat !== null) return;

    let cancelled = false;
    resolveUserLocation().then((loc) => {
      if (cancelled) return;
      setLocation(loc.lat, loc.lon, loc.name);
    });

    return () => { cancelled = true; };
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
    queryKey: ['home-station-prices', stations.slice(0, 12).map(s => s.id).sort().join(',')],
    queryFn: async (): Promise<StationWithPrices[]> => {
      const toFetch = stations.slice(0, 12);
      if (toFetch.length === 0) return [];

      const results = await Promise.allSettled(
        toFetch.map(s => api.get(`/prices/by-station?name=${encodeURIComponent(s.name)}&lat=${s.lat}&lon=${s.lon}&stationId=${s.id}`).then(r => ({
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

  // 3c. Cheapest stations (Regular 87) sorted ascending — for Market Overview grid
  const cheapestStations = useMemo(() => {
    if (!stationsWithPrices) return [];
    return stationsWithPrices
      .map(sp => {
        const price = sp.fuelPrices.find(fp => fp.type === 'REGULAR_UNLEADED')?.price || sp.fuelPrices[0]?.price || 0;
        return { sp, price };
      })
      .filter(x => x.price > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 12);
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
    // Community must be real-time — refetch on every visit, no stale cache.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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

  const { showToast } = useToast();

  const voteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: VoteType }) => {
      const res = await api.post(`/bills/${id}/${type}`);
      return res.data;
    },
    onMutate: async ({ id, type }) => {
      const userId = user?.id || user?._id;
      if (!userId) return { snapshots: undefined };
      const snapshots = await applyVoteOptimistic(queryClient, id, type, userId);
      return { snapshots };
    },
    onError: (_err: any, _vars: any, context: any) => {
      rollbackVote(queryClient, context?.snapshots);
      showToast('Failed to register your vote. Please try again.', 'error');
    },
    onSettled: () => {
      invalidateVoteQueries(queryClient);
    },
  });

  const handleVote = (id: string, type: 'helpful' | 'not-helpful') => {
    if (!user) {
      showToast('Please log in to vote on community reports', 'warning');
      navigate('/login?returnTo=' + encodeURIComponent(location.pathname + location.search));
      return;
    }
    voteMutation.mutate({ id, type });
  };

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
    <div className="flex flex-col flex-1 pb-4 sm:pb-10 w-full">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-info/10 to-transparent -z-10" />

      <div className="pt-6">
        {/* ─── Header ─── */}
        <div className="reveal flex justify-between items-center mb-5 sm:mb-8">
          <div>
            <p className="text-xs sm:text-sm font-semibold text-textMuted mb-1.5 sm:mb-2 uppercase tracking-wider">{t('profile.location')}</p>
            <button 
              onClick={() => navigate('/location-search')}
              className="flex items-center gap-1.5 sm:gap-2 glass px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-glass-sm hover:shadow-glass transition-all group"
            >
              <MapPin size={16} className="text-primary sm:w-[18px] sm:h-[18px]" />
              <span className="font-semibold text-base sm:text-lg text-textPrimary truncate max-w-[200px] sm:max-w-none">{locationName}</span>
              <ChevronDown size={16} className="text-textMuted group-hover:text-textPrimary transition-colors shrink-0" />
            </button>
          </div>
        </div>

        {/* ─── Market Overview: Cheapest Stations (Regular 87) ─── */}
        <div className="reveal mb-5 sm:mb-8">
          <h2 className="font-heading font-bold text-lg sm:text-xl text-textPrimary mb-3 sm:mb-4">{t('home.marketOverview') || 'Market Overview'}</h2>
          {isLoading ? (
            <div className="premium-card p-8 flex flex-col items-center justify-center min-h-[150px]">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-medium text-sm text-textMuted mt-3">{t('home.fetchingPrices')}</p>
            </div>
          ) : cheapestStations.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 stagger-children">
              {cheapestStations.map(({ sp, price }, idx) => {
                const dist = lat && lon ? calculateDistanceMiles(lat, lon, sp.station.lat, sp.station.lon) : null;
                return (
                  <SpotlightCard key={sp.station.id} className="premium-card premium-card-hover animate-fade-in-up cursor-pointer" spotlightColor="rgb(var(--color-primary) / 0.06)">
                    <button onClick={() => navigate(`/station/${sp.station.id}`)} className="p-3 sm:p-4 flex flex-col text-left group w-full h-full">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="font-bold text-[10px] sm:text-[11px] text-primary bg-avatarBg px-2 sm:px-2.5 py-0.5 rounded-full">#{idx + 1} Cheapest</span>
                        {dist !== null && (
                          <div className="flex items-center text-textMuted">
                            <Navigation size={10} className="mr-0.5 sm:mr-1" />
                            <span className="font-medium text-[10px] sm:text-[11px]">{dist.toFixed(1)} mi</span>
                          </div>
                        )}
                      </div>
                      <p className="font-bold text-[13px] sm:text-sm text-textPrimary truncate">{sp.station.name}</p>
                      {sp.station.address && <p className="font-medium text-[10px] sm:text-[11px] text-textMuted truncate mb-2 sm:mb-3">{sp.station.address}</p>}
                      <div className="flex items-baseline gap-1 mt-auto">
                        <span className="font-bold text-xl sm:text-2xl text-textPrimary tracking-tight">${price.toFixed(2)}</span>
                        <span className="font-medium text-[10px] sm:text-xs text-textMuted">{t('home.perGal')}</span>
                      </div>
                    </button>
                  </SpotlightCard>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[150px]">
              <MapPin size={28} className="text-textMuted/30" />
              <p className="font-medium text-sm text-textMuted mt-2">{t('home.noPriceData')}</p>
            </div>
          )}
        </div>

        {/* ─── Tabs: Market / Community ─── */}
        <div className="reveal flex bg-surfaceMuted rounded-2xl p-1 mb-4 sm:mb-5">
          <button
            onClick={() => setActiveTab('market')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl transition-all ${activeTab === 'market' ? 'bg-surface shadow-sm text-textPrimary font-semibold' : 'text-textMuted font-medium'}`}
          >
            <Map size={15} className={activeTab === 'market' ? 'text-primary' : 'text-textMuted'} />
            <span className="text-sm">{t('home.market')}</span>
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl transition-all ${activeTab === 'community' ? 'bg-surface shadow-sm text-textPrimary font-semibold' : 'text-textMuted font-medium'}`}
          >
            <Users size={15} className={activeTab === 'community' ? 'text-primary' : 'text-textMuted'} />
            <span className="text-sm">
              {t('home.community')} {allCommunityPrices.length > 0 ? `(${allCommunityPrices.length})` : ''}
            </span>
          </button>
        </div>

        {/* ─── Tab Content ─── */}
        {activeTab === 'market' ? (
          <div>
            <div className="reveal flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="font-heading font-bold text-lg sm:text-xl text-textPrimary">{t('home.gasStations')}</h2>
              <button onClick={() => navigate('/station/all')} className="font-semibold text-[13px] sm:text-sm text-primary">See all</button>
            </div>

            {stationsLoading ? (
              <div className="flex justify-center mt-10">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stations.length > 0 ? (
              <div className="flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {stations.slice(0, 10).map((item) => {
                  const sp = stationsWithPrices?.find(s => s.station.id === item.id);
                  const regularPrice = sp?.fuelPrices?.find(fp => fp.type === 'REGULAR_UNLEADED')?.price || sp?.fuelPrices?.[0]?.price;

                  return (
                    <TiltCard key={item.id} className="reveal premium-card overflow-hidden" tiltStrength={6} onClick={() => navigate(`/station/${item.id}`)}>
                      {/* Mobile: Horizontal card | Desktop: Vertical card */}
                      <div className="text-left flex flex-row sm:flex-col group cursor-pointer">
                      <div className="w-28 h-24 sm:w-full sm:h-40 bg-surfaceMuted relative flex items-center justify-center overflow-hidden rounded-l-[0.875rem] sm:rounded-l-none sm:rounded-t-[0.875rem] shrink-0">
                        {item.photoRef ? (
                          <img src={getPhotoUrl(item.photoRef, 400)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <MapPin size={24} className="text-primary sm:w-8 sm:h-8" />
                        )}
                        {regularPrice && (
                          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/70 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg backdrop-blur-md">
                            <span className="font-bold text-xs sm:text-sm text-white">${regularPrice.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col flex-1 min-w-0 justify-center">
                        <h3 className="font-bold text-[14px] sm:text-base text-textPrimary truncate mb-0.5 sm:mb-1">{item.name}</h3>
                        {item.address && <p className="font-medium text-[11px] sm:text-xs text-textMuted truncate mb-2 sm:mb-3">{item.address}</p>}
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-auto">
                          <div className="flex items-center bg-warning/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
                            <Star size={11} className="text-[#FFB800] fill-[#FFB800] mr-0.5 sm:mr-1" />
                            <span className="font-bold text-[11px] sm:text-xs text-[#B38000] dark:text-[#FFD060]">{item.rating > 0 ? item.rating.toFixed(1) : 'New'}</span>
                          </div>
                          {item.totalRatings > 0 && <span className="font-medium text-[10px] sm:text-xs text-textMuted">({item.totalRatings})</span>}
                          <div className="flex items-center text-textMuted ml-auto">
                            <Navigation size={11} className="mr-0.5 sm:mr-1" />
                            <span className="font-medium text-[11px] sm:text-xs">Nearby</span>
                          </div>
                        </div>
                      </div>
                      </div>
                    </TiltCard>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center mt-10 gap-3">
                <MapPin size={28} className="text-textMuted/30" />
                <p className="font-medium text-[15px] text-textMuted text-center">
                  {lat ? 'No stations found nearby' : 'Getting your location...'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="reveal flex justify-between items-center mb-4">
              <h2 className="font-heading font-bold text-xl text-textPrimary">{t('home.communityReports')}</h2>
            </div>
            
            {communityPricesLoading ? (
              <div className="flex flex-col items-center justify-center mt-10 gap-3">
                <Loader2 size={32} className="text-primary animate-spin" />
                <p className="font-medium text-[15px] text-textMuted text-center">Loading community reports...</p>
              </div>
            ) : allCommunityPrices.length > 0 ? (
              <div className="flex flex-col sm:grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 stagger-children">
                {allCommunityPrices.map((cp: any, idx: number) => (
                  <button key={idx} onClick={() => navigate(`/station/${cp.stationId}`)} className="premium-card premium-card-hover p-4 sm:p-5 text-left flex flex-col w-full group animate-fade-in-up">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {cp.reportedByAvatar ? (
                          <img src={cp.reportedByAvatar} alt={cp.reportedBy} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-avatarBg to-primary/10 flex items-center justify-center border border-border">
                            <User size={16} className="text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-[13px] sm:text-sm text-textPrimary truncate">{cp.reportedBy}</p>
                          <p className="font-medium text-[11px] sm:text-xs text-textMuted truncate mt-0.5">{cp.stationName}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-end justify-between bg-surfaceMuted p-3 sm:p-4 rounded-xl mb-3 sm:mb-4">
                      <div>
                        <span className="font-medium text-[10px] sm:text-[11px] text-textMuted uppercase tracking-wider mb-1 block">Reported Price</span>
                        <div className="bg-avatarBg px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md inline-block">
                          <span className="font-bold text-[11px] sm:text-xs text-primary capitalize">{cp.fuelType || 'regular'}</span>
                        </div>
                      </div>
                      <span className="font-bold text-2xl sm:text-3xl text-textPrimary tracking-tight">${cp.price?.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <Camera size={14} className="text-textMuted" />
                        <span className="font-medium text-[12px] text-textMuted">{formatDate(cp.billDate)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          className={`flex items-center gap-1.5 transition-all duration-200 hover:scale-110 active:scale-95 rounded-lg px-2 py-1 -mx-2 -my-1 ${cp.helpfulUsers?.includes(user?._id || user?.id) ? 'bg-primary/10' : 'hover:bg-surfaceMuted'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) return showToast(t('common.loginRequired') || 'Please log in again to continue.', 'error');
                            handleVote(cp.id, 'helpful');
                          }}
                        >
                          <ThumbsUp size={16} className={`transition-colors duration-200 ${cp.helpfulUsers?.includes(user?._id || user?.id) ? 'text-primary fill-primary/20' : 'text-textMuted'}`} />
                          <span className={`text-sm font-semibold transition-colors duration-200 ${cp.helpfulUsers?.includes(user?._id || user?.id) ? 'text-primary' : 'text-textMuted'}`}>{cp.helpfulCount || 0}</span>
                        </button>
                        <button 
                          className={`flex items-center gap-1.5 transition-all duration-200 hover:scale-110 active:scale-95 rounded-lg px-2 py-1 -mx-2 -my-1 ${cp.notHelpfulUsers?.includes(user?._id || user?.id) ? 'bg-error/10' : 'hover:bg-surfaceMuted'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) return showToast(t('common.loginRequired') || 'Please log in again to continue.', 'error');
                            handleVote(cp.id, 'not-helpful');
                          }}
                        >
                          <ThumbsDown size={16} className={`transition-colors duration-200 ${cp.notHelpfulUsers?.includes(user?._id || user?.id) ? 'text-error fill-error/20' : 'text-textMuted'}`} />
                          <span className={`text-sm font-semibold transition-colors duration-200 ${cp.notHelpfulUsers?.includes(user?._id || user?.id) ? 'text-error' : 'text-textMuted'}`}>{cp.notHelpfulCount || 0}</span>
                        </button>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center mt-10 gap-3">
                <Users size={32} className="text-textMuted/30" />
                <p className="font-medium text-[15px] text-textMuted text-center">{t('station.noReports')}</p>
                <button onClick={() => navigate('/map')} className="flex items-center gap-2 bg-avatarBg px-5 py-3 rounded-full mt-1 hover:bg-primary/15 transition-colors">
                  <Map size={14} className="text-primary" />
                  <span className="font-semibold text-sm text-primary">{t('home.exploreMap')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
