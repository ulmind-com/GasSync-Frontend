import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Share2, Heart, Star, MapPin, Navigation, DollarSign, Image as ImageIcon, Droplet, ShoppingBag, Coffee, Zap, User, ThumbsUp, ThumbsDown, X, Maximize2, Fuel } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPlaceDetails, getPhotoUrl } from '../lib/overpass';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { applyVoteOptimistic, rollbackVote, invalidateVoteQueries } from '../lib/voteCache';
import type { VoteType } from '../lib/voteCache';
import { useToast } from '../components/Toast';
import { SpotlightCard } from '../components/CursorEffects';

const HEADER_HEIGHT = 280;

const FUEL_LABELS: Record<string, string> = {
  regular: 'Regular 87', midgrade: 'Plus 89', premium: 'Premium 93',
  diesel: 'Diesel', e85: 'E85 Flex', unl88: 'UNL 88',
};

const FUEL_TYPE_MAP: Record<string, { label: string }> = {
  REGULAR_UNLEADED: { label: 'Regular 87' }, MIDGRADE: { label: 'Plus 89' },
  PREMIUM: { label: 'Premium 93' }, DIESEL: { label: 'Diesel' },
  E85: { label: 'E85 Flex' }, UNL88: { label: 'UNL 88' },
  regular: { label: 'Regular 87' }, midgrade: { label: 'Plus 89' },
  premium: { label: 'Premium 93' }, diesel: { label: 'Diesel' },
  e85: { label: 'E85 Flex' }, unl88: { label: 'UNL 88' },
};

// Display order for fuel grades: Regular 87 first, then the rest
const FUEL_ORDER: Record<string, number> = {
  REGULAR_UNLEADED: 0, regular: 0,
  MIDGRADE: 1, midgrade: 1,
  PREMIUM: 2, premium: 2,
  DIESEL: 3, diesel: 3,
  E85: 4, e85: 4,
  UNL88: 5, unl88: 5,
};
const fuelRank = (type: string) => (FUEL_ORDER[type] ?? 99);

const AMENITY_MAP: Record<string, { icon: React.ReactNode, label: string }> = {
  car_wash: { icon: <Droplet size={22} />, label: 'Car Wash' },
  convenience_store: { icon: <ShoppingBag size={22} />, label: 'Store' },
  atm: { icon: <DollarSign size={22} />, label: 'ATM' },
  cafe: { icon: <Coffee size={22} />, label: 'Cafe' },
  restaurant: { icon: <Coffee size={22} />, label: 'Food' },
  food: { icon: <Coffee size={22} />, label: 'Food' },
  electric_vehicle_station: { icon: <Zap size={22} />, label: 'EV Charge' },
};

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Updated ${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Updated ${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `Updated ${diffInDays}d ago`;
}

export default function StationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { token, user, setFavorites } = useAuthStore();
  const { isDark } = useThemeStore();

  const isFavorite = user?.favorites?.some((f: any) => f.id === id) || false;

  const [priceTab, setPriceTab] = useState<'market' | 'community'>('market');
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

  // Lock background page scroll while a modal is open so the wheel scrolls the
  // modal content instead of the page behind it.
  const isModalOpen = !!selectedBill || !!fullScreenImage;
  useEffect(() => {
    if (!isModalOpen) return;
    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [isModalOpen]);

  const { data: station, isLoading, refetch: refetchStation } = useQuery({
    queryKey: ['station', id],
    queryFn: () => getPlaceDetails(id!),
    enabled: !!id,
  });

  const { data: priceData, refetch: refetchPrices } = useQuery({
    queryKey: ['station-prices', station?.id],
    queryFn: async () => {
      const res = await api.get(`/prices/by-station?name=${encodeURIComponent(station!.name)}&lat=${station!.lat}&lon=${station!.lon}&stationId=${station!.id}`);
      return res.data?.data;
    },
    enabled: !!station,
    // Community prices must be real-time (never cached): always refetch on open/focus.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { showToast } = useToast();

  const voteMutation = useMutation({
    mutationFn: async ({ billId, type }: { billId: string; type: VoteType }) => {
      const res = await api.post(`/bills/${billId}/${type}`);
      return res.data;
    },
    onMutate: async ({ billId, type }) => {
      const userId = user?._id || user?.id;
      if (!userId) return { snapshots: undefined };
      const snapshots = await applyVoteOptimistic(queryClient, billId, type, userId);
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

  const handleVote = (billId: string, type: 'helpful' | 'not-helpful') => {
    if (!user) {
      showToast('Please log in to vote on community reports', 'warning');
      navigate('/login?returnTo=' + encodeURIComponent(location.pathname + location.search));
      return;
    }
    voteMutation.mutate({ billId, type });
  };

  const handleToggleFavorite = async () => {
    if (!token || !user) {
      navigate('/login?returnTo=' + encodeURIComponent(location.pathname + location.search));
      return;
    }
    const originalFavorites = [...(user.favorites || [])];
    if (isFavorite) {
      setFavorites(originalFavorites.filter((f: any) => f.id !== id));
    } else if (station) {
      setFavorites([...originalFavorites, station]);
    }
    try {
      if (station) { await api.post('/auth/me/favorites/toggle', station); }
    } catch (error) { setFavorites(originalFavorites); }
  };

  const handleShare = async () => {
    if (!station) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `GasSync - ${station.name}`, text: `Check out the latest gas prices at ${station.name} on GasSync! ⛽\n\nFind it here: ${station.address}`, url: window.location.href });
      } catch (error) { console.warn('Error sharing station:', error); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Recently';
    const day = d.getDate();
    const getSuffix = (n: number) => { if (n >= 11 && n <= 13) return 'th'; switch (n % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; } };
    const month = d.toLocaleString('en-US', { month: 'long' });
    return `${day}${getSuffix(day)} ${month} ${d.getFullYear()}`;
  };

  if (isLoading || !station) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-medium text-textMuted mt-4">Loading station details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-background relative overflow-hidden pb-10 w-full">
      {/* ─── Header Image ─── */}
      <div className="relative w-full h-[40vh] sm:h-[55vh] min-h-[280px] sm:min-h-[420px] z-0">
        <div className="absolute top-0 left-0 right-0 p-4 sm:p-5 z-20 flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center glass shadow-glass-sm transition-all hover:scale-105 active:scale-95">
            <ArrowLeft size={18} className="text-textPrimary" />
          </button>
          <div className="flex gap-2 sm:gap-3">
            <button onClick={handleShare} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center glass shadow-glass-sm transition-all hover:scale-105 active:scale-95">
              <Share2 size={18} className="text-textPrimary" />
            </button>
            <button onClick={handleToggleFavorite} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center glass shadow-glass-sm transition-all hover:scale-105 active:scale-95">
              <Heart size={18} className={isFavorite ? "text-error fill-error" : "text-textPrimary"} />
            </button>
          </div>
        </div>

        {station.photoRef ? (
          <img src={getPhotoUrl(station.photoRef, 1200)} alt={station.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-avatarBg flex items-center justify-center">
            <MapPin size={64} className="text-primary" />
          </div>
        )}
        <div className="absolute bottom-0 w-full h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* ─── Main Content (2-Column Desktop) ─── */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-5 pb-10 relative z-10 -mt-16 sm:-mt-20 flex flex-col md:flex-row gap-5 sm:gap-8">
        {/* Left Column */}
        <div className="flex-1">
          <SpotlightCard className="liquid-glass rounded-[24px] sm:rounded-[32px] mb-4 sm:mb-6 relative" spotlightColor="rgb(var(--color-primary) / 0.05)">
          <div className="p-5 sm:p-8">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <h1 className="font-bold text-[24px] sm:text-[32px] text-textPrimary leading-tight mr-3 sm:mr-4 tracking-tight">{station.name}</h1>
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#FFB800] to-[#F5A623] px-3.5 py-2 rounded-2xl shadow-sm shrink-0 mt-1">
                <Star size={16} className="text-white fill-white" />
                <span className="font-bold text-[15px] text-white">{station.rating > 0 ? station.rating.toFixed(1) : 'New'}</span>
              </div>
            </div>

            <div className="flex items-center mb-5 sm:mb-8 text-textSecondary">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surfaceMuted flex items-center justify-center shrink-0 mr-2.5 sm:mr-3">
                <MapPin size={14} className="text-textSecondary" />
              </div>
              <span className="font-medium text-[13px] sm:text-[15px]">{station.address}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => station && window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`, '_blank')}
                className="flex-1 flex justify-center items-center premium-card py-2.5 px-3 group hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[14px] flex-1 justify-center shadow-sm group-hover:brightness-110 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-primary-strong)))',
                    color: 'white',
                    boxShadow: '0 4px 14px -4px rgb(var(--color-primary) / 0.5)'
                  }}
                >
                  <Navigation size={18} fill="currentColor" />
                  <span style={{ color: 'white' }}>{t('station.navigate') || 'Navigate'}</span>
                </div>
              </button>
            </div>
          </div>
          </SpotlightCard>

          {/* Amenities */}
          <div className="reveal liquid-glass p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] mb-4 sm:mb-6">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-textPrimary mb-4 sm:mb-6 tracking-tight">{t('station.amenities')}</h2>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {(() => {
                if (!station.types) return null;
                const seenLabels = new Set<string>();
                return station.types.map((type: string, idx: number) => {
                  const amenity = AMENITY_MAP[type];
                  if (!amenity) return null;
                  if (seenLabels.has(amenity.label)) return null;
                  seenLabels.add(amenity.label);
                  return (
                    <div key={`type-${idx}`} className="flex flex-col items-center w-[80px] shrink-0">
                      <div className="w-[52px] h-[52px] rounded-2xl bg-surface shadow-premium-sm flex items-center justify-center mb-2 text-textSecondary">
                        {amenity.icon}
                      </div>
                      <span className="font-medium text-xs text-textSecondary text-center">{amenity.label}</span>
                    </div>
                  );
                });
              })()}

              {(!station.types || !station.types.some((t: string) => AMENITY_MAP[t])) && (() => {
                let hash = 0;
                for (let i = 0; i < station.id.length; i++) { hash = station.id.charCodeAt(i) + ((hash << 5) - hash); }
                hash = Math.abs(hash);
                const ALL_AMENITIES = [
                  { icon: <Droplet size={22} />, label: 'Car Wash' },
                  { icon: <ShoppingBag size={22} />, label: 'Store' },
                  { icon: <Coffee size={22} />, label: 'Coffee' },
                  { icon: <DollarSign size={22} />, label: 'ATM' },
                ];
                const count = (hash % 3) + 2;
                const shuffled = [...ALL_AMENITIES].sort((a, b) => { const hashA = (hash * a.label.charCodeAt(0)) % 100; const hashB = (hash * b.label.charCodeAt(0)) % 100; return hashA - hashB; });
                return shuffled.slice(0, count).map((am, idx) => (
                  <div key={`fallback-${idx}`} className="flex flex-col items-center w-[80px] shrink-0">
                    <div className="w-[52px] h-[52px] rounded-2xl bg-surface shadow-premium-sm flex items-center justify-center mb-2 text-textSecondary">{am.icon}</div>
                    <span className="font-medium text-xs text-textSecondary text-center">{am.label}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full md:w-[400px] shrink-0">
          <button
            onClick={() => navigate(`/scanner?googlePlaceId=${id}&stationName=${encodeURIComponent(station?.name || '')}`)}
            className="btn-primary w-full h-[48px] sm:h-[52px] rounded-2xl mb-4 sm:mb-6"
          >
            <Fuel size={20} className="mr-2" />
            <span className="font-bold text-[15px] tracking-wide">{t('station.updatePrice') || 'Update Price'}</span>
          </button>

          <SpotlightCard className="liquid-glass rounded-[24px] sm:rounded-[32px] mb-4 sm:mb-6 reveal" spotlightColor="rgb(var(--color-info) / 0.04)">
          <div className="p-5 sm:p-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-textPrimary tracking-tight">{t('station.pricesAndReports') || 'Prices & Reports'}</h2>
              {priceData?.fetchedAt && (
                <div className="bg-surfaceMuted px-2.5 py-1 rounded-lg">
                  <span className="font-medium text-xs text-textMuted">{getRelativeTime(priceData.fetchedAt)}</span>
                </div>
              )}
            </div>

            <div className="flex mb-4 bg-surfaceMuted rounded-xl p-1">
              <button className={`flex-1 py-2.5 rounded-lg text-center font-semibold text-[13px] transition-colors ${priceTab === 'market' ? 'bg-surface text-textPrimary shadow-sm' : 'text-textMuted'}`} onClick={() => setPriceTab('market')}>
                {t('home.market') || 'Market'}
              </button>
              <button className={`flex-1 py-2.5 rounded-lg text-center font-semibold text-[13px] transition-colors ${priceTab === 'community' ? 'bg-surface text-textPrimary shadow-sm' : 'text-textMuted'}`} onClick={() => setPriceTab('community')}>
                {t('home.community') || 'Community'} ({priceData?.communityPrices?.length || 0})
              </button>
            </div>

            {priceTab === 'market' ? (
              priceData?.fuelPrices && priceData.fuelPrices.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {[...priceData.fuelPrices].sort((a: any, b: any) => fuelRank(a.type) - fuelRank(b.type)).map((fp: any, idx: number) => {
                    const mapped = FUEL_TYPE_MAP[fp.type] || { label: fp.type };
                    return (
                      <div key={idx} className="flex premium-card overflow-hidden">
                        <div className="w-1 sm:w-1.5 h-full bg-primary" />
                        <div className="p-3 sm:p-4 flex-1">
                          <p className="font-medium text-[12px] sm:text-[13px] text-textMuted mb-0.5 sm:mb-1">{mapped.label}</p>
                          <p className="font-normal text-xl sm:text-2xl text-textPrimary tracking-tight">${fp.price.toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 bg-surfaceMuted/50 rounded-2xl border border-border border-dashed">
                  <DollarSign size={48} className="text-textMuted/30 mb-3" />
                  <p className="font-medium text-[15px] text-textMuted">{t('station.noPriceData') || 'No price data available'}</p>
                </div>
              )
            ) : (
              priceData?.communityPrices && priceData.communityPrices.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {priceData.communityPrices.map((cp: any, idx: number) => (
                    <button key={idx} className="premium-card premium-card-hover p-4 text-left" onClick={() => setSelectedBill(cp)}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {cp.reportedByAvatar ? (
                            <img src={cp.reportedByAvatar} alt={cp.reportedBy} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-avatarBg flex items-center justify-center">
                              <User size={14} className="text-primary" />
                            </div>
                          )}
                          <span className="font-semibold text-sm text-textPrimary">{cp.reportedBy}</span>
                        </div>
                        <span className="font-normal text-xl text-textPrimary tracking-tight">${cp.price?.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-surfaceMuted px-2 py-1 rounded-md">
                            <span className="font-medium text-[11px] text-textMuted">
                              {cp.fuelType ? (FUEL_LABELS[cp.fuelType] || cp.fuelType.charAt(0).toUpperCase() + cp.fuelType.slice(1)) : '—'}
                            </span>
                          </div>
                          <span className="font-normal text-xs text-textMuted">{formatDate(cp.billDate)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            className={`flex items-center gap-1.5 transition-all duration-200 hover:scale-110 active:scale-95 rounded-lg px-2 py-1 ${cp.helpfulUsers?.includes(user?._id || user?.id) ? 'bg-primary/10' : 'hover:bg-surfaceMuted'}`}
                            onClick={(e) => { e.stopPropagation(); handleVote(cp.id, 'helpful'); }}
                          >
                            <ThumbsUp size={14} className={`transition-colors duration-200 ${cp.helpfulUsers?.includes(user?._id || user?.id) ? 'text-primary fill-primary/20' : 'text-textMuted'}`} />
                            <span className={`text-xs font-semibold transition-colors duration-200 ${cp.helpfulUsers?.includes(user?._id || user?.id) ? 'text-primary' : 'text-textMuted'}`}>{cp.helpfulCount || 0}</span>
                          </button>
                          <button
                            className={`flex items-center gap-1.5 transition-all duration-200 hover:scale-110 active:scale-95 rounded-lg px-2 py-1 ${cp.notHelpfulUsers?.includes(user?._id || user?.id) ? 'bg-error/10' : 'hover:bg-surfaceMuted'}`}
                            onClick={(e) => { e.stopPropagation(); handleVote(cp.id, 'not-helpful'); }}
                          >
                            <ThumbsDown size={14} className={`transition-colors duration-200 ${cp.notHelpfulUsers?.includes(user?._id || user?.id) ? 'text-error fill-error/20' : 'text-textMuted'}`} />
                            <span className={`text-xs font-semibold transition-colors duration-200 ${cp.notHelpfulUsers?.includes(user?._id || user?.id) ? 'text-error' : 'text-textMuted'}`}>{cp.notHelpfulCount || 0}</span>
                          </button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6">
                  <User size={32} className="text-textMuted/30" />
                  <p className="font-medium text-sm text-textMuted mt-2 text-center">{t('station.noReports')}</p>
                </div>
              )
            )}
          </div>
          </SpotlightCard>
        </div>
      </div>

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="fixed inset-0 premium-modal-backdrop z-[100] flex items-end sm:items-center justify-center transition-opacity">
          <div className="premium-modal w-full sm:w-[400px] h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-xl text-textPrimary">{t('station.billDetails')}</h2>
              <button onClick={() => setSelectedBill(null)} className="w-8 h-8 rounded-full bg-surfaceMuted flex items-center justify-center text-textMuted">
                <X size={18} />
              </button>
            </div>
            <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 rounded-full bg-surfaceMuted flex items-center justify-center mr-4 overflow-hidden">
                  {selectedBill.reportedByAvatar ? (
                    <img src={selectedBill.reportedByAvatar} alt={selectedBill.reportedBy} className="w-full h-full object-cover" />
                  ) : ( <User size={20} className="text-primary" /> )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-textPrimary mb-0.5">{selectedBill.reportedBy}</h3>
                  <p className="font-normal text-[13px] text-textMuted">{formatDate(selectedBill.billDate)}</p>
                </div>
              </div>
              <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-surfaceMuted rounded-2xl p-4">
                  <p className="font-medium text-xs text-textMuted mb-1">{t('station.pricePerGal')}</p>
                  <p className="font-bold text-[22px] text-textPrimary tracking-tight">${selectedBill.price?.toFixed(3)}</p>
                </div>
                <div className="flex-1 bg-surfaceMuted rounded-2xl p-4">
                  <p className="font-medium text-xs text-textMuted mb-1">{t('station.fuelType')}</p>
                  <p className="font-bold text-xl text-textPrimary tracking-tight">
                    {selectedBill.fuelType ? (FUEL_LABELS[selectedBill.fuelType] || selectedBill.fuelType.charAt(0).toUpperCase() + selectedBill.fuelType.slice(1)) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 mb-8">
                <div className="flex-1 bg-surfaceMuted rounded-2xl p-4">
                  <p className="font-medium text-xs text-textMuted mb-1">{t('station.gallons')}</p>
                  <p className="font-bold text-xl text-textPrimary">{selectedBill.totalGallons ? `${selectedBill.totalGallons}` : '—'}</p>
                </div>
                <div className="flex-1 bg-surfaceMuted rounded-2xl p-4">
                  <p className="font-medium text-xs text-textMuted mb-1">{t('station.totalAmount')}</p>
                  <p className="font-bold text-xl text-textPrimary">{selectedBill.totalAmount ? `$${selectedBill.totalAmount.toFixed(2)}` : '—'}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2.5 mb-8">
                <div className="inline-flex items-center gap-1.5 bg-primary/10 px-3.5 py-1.5 rounded-full">
                  <ThumbsUp size={14} className="text-primary fill-primary/20" />
                  <span className="text-[13px] font-bold text-primary">{selectedBill.helpfulCount || 0}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-error/10 px-3.5 py-1.5 rounded-full">
                  <ThumbsDown size={14} className="text-error fill-error/20" />
                  <span className="text-[13px] font-bold text-error">{selectedBill.notHelpfulCount || 0}</span>
                </div>
              </div>
              {selectedBill.imageUrl ? (
                <div>
                  <p className="font-semibold text-sm text-textPrimary mb-3 ml-1">{t('station.receiptImage')}</p>
                  <button onClick={() => setFullScreenImage(selectedBill.imageUrl)} className="w-full h-[300px] bg-black rounded-2xl overflow-hidden relative group">
                    <img src={selectedBill.imageUrl} alt="Receipt" className="w-full h-full object-contain" />
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                      <Maximize2 size={16} className="text-white" />
                    </div>
                  </button>
                </div>
              ) : (
                <div className="h-[200px] bg-surfaceMuted border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center">
                  <ImageIcon size={32} className="text-textMuted/30 mb-3" />
                  <p className="font-medium text-[15px] text-textMuted">No receipt image available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div className="fixed inset-0 bg-black z-[110] flex items-center justify-center transition-opacity">
          <button onClick={() => setFullScreenImage(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center z-10 hover:bg-white/30 transition-colors">
            <X size={24} className="text-white" />
          </button>
          <img src={fullScreenImage} alt="Receipt Fullscreen" className="w-full h-full object-contain" />
        </div>
      )}
    </div>
  );
}
