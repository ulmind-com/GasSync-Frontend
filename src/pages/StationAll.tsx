import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Star, Clock, Navigation } from 'lucide-react';
import { useLocationStore } from '../store/locationStore';
import { fetchGasStationsPaginated, getPhotoUrl, calculateDistanceMiles } from '../lib/overpass';

export default function StationAll() {
  const navigate = useNavigate();
  const { lat, lon, radiusMiles, activeFilter } = useLocationStore();
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['all-stations-paginated', lat, lon, radiusMiles],
    queryFn: async ({ pageParam }) => {
      // Delay slightly for smooth UI transitions and to allow Google Places API next_page_token to become valid
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

    if (activeFilter === 'open') {
      all = all.filter(s => s.isOpen);
    } else if (activeFilter === 'top_rated') {
      all = all.filter(s => s.rating && s.rating >= 4.0);
    } else if (activeFilter === 'car_wash') {
      all = all.filter(s => s.types && s.types.includes('car_wash'));
    }
    
    const withDistance = all.map(station => {
      const dist = calculateDistanceMiles(lat, lon, station.lat, station.lon);
      return { ...station, distanceMiles: dist };
    });

    return withDistance.sort((a, b) => a.distanceMiles - b.distanceMiles);
  }, [data, lat, lon, activeFilter]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col flex-1 pb-10 w-full min-h-[calc(100vh-100px)] bg-[#F8FAFC] -mt-6">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#F8FAFC]/90 backdrop-blur-xl pt-8 pb-4 px-4 sm:px-6 lg:px-8 border-b border-gray-200/50 flex items-center justify-between mb-4">
        <button 
          onClick={() => navigate(-1)} 
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-100 text-gray-800 hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-bold text-2xl text-gray-900 tracking-tight">Gas Stations</h1>
          <p className="font-bold text-[13px] text-[#34C759] mt-0.5 bg-[#E8F8EC] px-3 py-1 rounded-full">{radiusMiles} Miles Radius • {stations.length} found</p>
        </div>
        <div className="w-12 h-12" />
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center mt-32">
            <div className="w-10 h-10 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
            <p className="font-semibold text-gray-500 mt-4 text-lg">Scanning wide area...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center mt-32">
            <p className="font-bold text-red-500 text-xl">Failed to load stations</p>
            <button onClick={() => navigate(0)} className="mt-4 text-[#34C759] font-semibold hover:underline">Try Again</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {stations.map((item, idx) => (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => navigate(`/station/${item.id}`)}
                  className="bg-white rounded-[24px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col text-left hover:shadow-lg hover:border-gray-200 transition-all hover:-translate-y-1 group relative overflow-hidden"
                >
                  <div className="w-full h-[180px] rounded-[18px] bg-gray-50 shrink-0 overflow-hidden relative mb-4">
                    {item.photoRef ? (
                      <img src={getPhotoUrl(item.photoRef, 400)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#E8F8EC] group-hover:scale-105 transition-transform duration-500">
                        <MapPin size={48} className="text-[#34C759]" />
                      </div>
                    )}
                    
                    {/* Distance Badge floating over image */}
                    <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm ${item.distanceMiles < 6.2 ? 'bg-[#E8F8EC]/90 border border-[#34C759]/20' : 'bg-[#E6F4FE]/90 border border-[#208AEF]/20'}`}>
                      <Navigation size={12} className={item.distanceMiles < 6.2 ? 'text-[#34C759]' : 'text-[#208AEF]'} />
                      <span className={`font-bold text-xs tracking-wide ${item.distanceMiles < 6.2 ? 'text-[#34C759]' : 'text-[#208AEF]'}`}>
                        {item.distanceMiles.toFixed(1)} mi
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col flex-1 min-w-0 w-full px-1">
                    <h3 className="font-bold text-[19px] text-gray-900 truncate mb-1.5 tracking-tight">{item.name}</h3>
                    {item.address && <p className="font-medium text-[13px] text-gray-500 truncate mb-5">{item.address}</p>}

                    <div className="flex items-center gap-2 mt-auto">
                      <div className="flex items-center bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl">
                        <Star size={14} className="text-[#FFB800] fill-[#FFB800] mr-1.5" />
                        <span className="font-bold text-[13px] text-gray-900">{item.rating > 0 ? item.rating.toFixed(1) : 'New'}</span>
                        {item.totalRatings > 0 && <span className="font-medium text-[11px] text-gray-400 ml-1">({item.totalRatings})</span>}
                      </div>

                      <div className={`flex items-center border px-3 py-1.5 rounded-xl ${item.isOpen ? 'bg-[#E8F8EC] border-[#34C759]/20' : 'bg-[#FFF0E6] border-[#FF6B00]/20'}`}>
                        <Clock size={14} className={item.isOpen ? 'text-[#34C759]' : 'text-[#FF6B00]'} />
                        <span className={`font-bold text-[13px] ml-1.5 ${item.isOpen ? 'text-[#34C759]' : 'text-[#FF6B00]'}`}>
                          {item.isOpen === true ? 'Open' : item.isOpen === false ? 'Closed' : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {hasNextPage && (
              <div ref={observerTarget} className="flex justify-center mt-12 mb-8">
                {isFetchingNextPage ? (
                  <div className="bg-white border border-gray-200 px-8 py-3 rounded-2xl font-bold text-[15px] text-gray-800 shadow-sm flex items-center gap-3">
                    <div className="w-5 h-5 border-[3px] border-[#34C759] border-t-transparent rounded-full animate-spin" />
                    Loading more stations...
                  </div>
                ) : (
                  <div className="h-10" />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
