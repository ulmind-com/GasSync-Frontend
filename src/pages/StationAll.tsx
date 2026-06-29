import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Star, Clock, Navigation, Sliders } from 'lucide-react';
import { useLocationStore } from '../store/locationStore';
import { api } from '../lib/axios';
import { fetchGasStationsPaginated, getPhotoUrl, calculateDistanceMiles } from '../lib/overpass';
import { TiltCard } from '../components/CursorEffects';
import FilterModal from '../components/FilterModal';

export default function StationAll() {
  const navigate = useNavigate();
  const { lat, lon, radiusMiles, activeFilter, sortBy, selectedFuel } = useLocationStore();
  const observerTarget = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ['all-stations-paginated', lat, lon, radiusMiles],
    queryFn: async ({ pageParam }) => {
      if (pageParam) await new Promise(r => setTimeout(r, 1000));
      return fetchGasStationsPaginated(lat!, lon!, radiusMiles * 1609.34, pageParam as string | undefined);
    },
    getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!lat,
  });

  const stations = useMemo(() => {
    if (!data || !lat || !lon) return [];
    let all = data.pages.flatMap(page => page.results);
    if (activeFilter === 'open') all = all.filter(s => s.isOpen);
    else if (activeFilter === 'top_rated') all = all.filter(s => s.rating && s.rating >= 4.0);
    else if (activeFilter === 'car_wash') all = all.filter(s => s.types && s.types.includes('car_wash'));
    const withDistance = all.map(station => ({ ...station, distanceMiles: calculateDistanceMiles(lat, lon, station.lat, station.lon) }));
    return withDistance.sort((a, b) => a.distanceMiles - b.distanceMiles);
  }, [data, lat, lon, activeFilter]);

  // Fetch all fuel-type prices for the listed stations
  const { data: stationPrices } = useQuery({
    queryKey: ['all-station-prices', stations.map(s => s.id).sort().join(',')],
    queryFn: async () => {
      const toFetch = stations.slice(0, 40);
      const results = await Promise.allSettled(
        toFetch.map(s => api.get(`/prices/by-place/${s.id}`).then(r => {
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

  // Default nearby order; sort by selected fuel price when chosen
  const sortedStations = useMemo(() => {
    if (sortBy === 'nearby' || !stationPrices) return stations;
    return [...stations].sort((a, b) => {
      const pa = stationPrices[a.id]?.[selectedFuel] ?? null;
      const pb = stationPrices[b.id]?.[selectedFuel] ?? null;
      if (pa == null && pb == null) return a.distanceMiles - b.distanceMiles;
      if (pa == null) return 1;
      if (pb == null) return -1;
      return sortBy === 'price_high' ? pb - pa : pa - pb;
    });
  }, [stations, stationPrices, selectedFuel, sortBy]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.1 });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col flex-1 pb-10 w-full min-h-[calc(100vh-100px)] bg-background -mt-6">
      {/* Header */}
      <div className="sticky top-0 z-30 glass pt-8 pb-4 px-4 sm:px-6 lg:px-8 border-b border-border flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="w-12 h-12 bg-surface rounded-full flex items-center justify-center shadow-premium-sm border border-border text-textPrimary hover:bg-surfaceMuted hover:scale-105 active:scale-95 transition-all">
          <ArrowLeft size={22} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-bold text-2xl text-textPrimary tracking-tight">Gas Stations</h1>
          <p className="font-bold text-[13px] text-primary mt-0.5 bg-avatarBg px-3 py-1 rounded-full">{radiusMiles} Miles Radius • {stations.length} found</p>
        </div>
        {(() => {
          const filtersActive = activeFilter !== 'all' || sortBy !== 'nearby' || selectedFuel !== 'REGULAR_UNLEADED';
          return (
            <button onClick={() => setFilterOpen(true)} className="relative w-12 h-12 bg-surface rounded-full flex items-center justify-center shadow-premium-sm border border-border text-textPrimary hover:bg-surfaceMuted hover:scale-105 active:scale-95 transition-all">
              <Sliders size={20} className={filtersActive ? 'text-primary' : ''} />
              {filtersActive && <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-surface" />}
            </button>
          );
        })()}
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center mt-32">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-semibold text-textMuted mt-4 text-lg">Scanning wide area...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center mt-32">
            <p className="font-bold text-error text-xl">Failed to load stations</p>
            <button onClick={() => navigate(0)} className="mt-4 text-primary font-semibold hover:underline">Try Again</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger-children">
              {sortedStations.map((item, idx) => (
                <TiltCard
                  key={`${item.id}-${idx}`}
                  className="reveal premium-card overflow-hidden"
                  tiltStrength={5}
                  onClick={() => navigate(`/station/${item.id}`)}
                >
                <div className="p-4 flex flex-col text-left group relative cursor-pointer">
                  <div className="w-full h-[180px] rounded-[18px] bg-surfaceMuted shrink-0 overflow-hidden relative mb-4">
                    {item.photoRef ? (
                      <img src={getPhotoUrl(item.photoRef, 400)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-avatarBg group-hover:scale-105 transition-transform duration-500">
                        <MapPin size={48} className="text-primary" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex items-baseline gap-1 px-3.5 py-2 rounded-xl bg-black/75 backdrop-blur-md shadow-md">
                      <span className="font-bold text-[16px] text-white tracking-tight">{stationPrices?.[item.id]?.[selectedFuel] ? `$${stationPrices[item.id][selectedFuel].toFixed(2)}` : '—'}</span>
                      <span className="font-medium text-[10px] text-white/70">/gal</span>
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 w-full px-1">
                    <h3 className="font-bold text-[19px] text-textPrimary truncate mb-1.5 tracking-tight">{item.name}</h3>
                    {item.address && <p className="font-medium text-[13px] text-textMuted truncate mb-5">{item.address}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 mt-auto">
                      <div className="flex items-center shrink-0 whitespace-nowrap bg-surfaceMuted border border-border px-2.5 py-1.5 rounded-xl">
                        <Star size={13} className="text-[#FFB800] fill-[#FFB800] mr-1" />
                        <span className="font-bold text-[12px] text-textPrimary">{item.rating > 0 ? item.rating.toFixed(1) : 'New'}</span>
                        {item.totalRatings > 0 && <span className="font-medium text-[11px] text-textMuted ml-1">({item.totalRatings})</span>}
                      </div>
                      <div className={`flex items-center shrink-0 whitespace-nowrap border px-2.5 py-1.5 rounded-xl ${item.isOpen ? 'bg-avatarBg border-primary/20' : 'bg-warning/10 border-warning/20'}`}>
                        <Clock size={13} className={item.isOpen ? 'text-primary' : 'text-warning'} />
                        <span className={`font-bold text-[12px] ml-1 ${item.isOpen ? 'text-primary' : 'text-warning'}`}>
                          {item.isOpen === true ? 'Open' : item.isOpen === false ? 'Closed' : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center shrink-0 whitespace-nowrap bg-surfaceMuted border border-border px-2.5 py-1.5 rounded-xl">
                        <Navigation size={13} className="text-textMuted mr-1" />
                        <span className="font-bold text-[12px] text-textPrimary">{item.distanceMiles.toFixed(1)} mi</span>
                      </div>
                    </div>
                  </div>
                </div>
                </TiltCard>
              ))}
            </div>
            {hasNextPage && (
              <div ref={observerTarget} className="flex justify-center mt-12 mb-8">
                {isFetchingNextPage ? (
                  <div className="premium-card px-8 py-3 font-bold text-[15px] text-textPrimary flex items-center gap-3">
                    <div className="w-5 h-5 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
                    Loading more stations...
                  </div>
                ) : ( <div className="h-10" /> )}
              </div>
            )}
          </>
        )}
      </div>

      <FilterModal open={filterOpen} onClose={() => setFilterOpen(false)} />
    </div>
  );
}
