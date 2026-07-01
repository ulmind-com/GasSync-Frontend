import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, BellOff, Lock, ThumbsUp, TrendingDown, Clock, MapPin, Bell, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

const NOTIF_ICON: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  helpful_vote: { icon: <ThumbsUp size={18} />, color: 'text-primary', bg: 'bg-avatarBg' },
  price_drop: { icon: <TrendingDown size={18} />, color: 'text-info', bg: 'bg-info/10' },
  inactivity_reminder: { icon: <Clock size={18} />, color: 'text-warning', bg: 'bg-warning/10' },
  location_reminder: { icon: <MapPin size={18} />, color: 'text-[#AF52DE]', bg: 'bg-[#AF52DE]/10' },
  general: { icon: <Bell size={18} />, color: 'text-textMuted', bg: 'bg-surfaceMuted' },
};

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Notifications() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const { t } = useTranslation();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => { const res = await api.get(`/notifications?page=${pageParam}&limit=10`); return res.data?.data; },
    enabled: !!token,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => { const p = lastPage?.pagination; return p && p.page < p.totalPages ? p.page + 1 : undefined; },
  });

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const markAllReadMutation = useMutation({ mutationFn: () => api.put('/notifications/mark-read'), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['unread-count'] }); } });
  const markOneReadMutation = useMutation({ mutationFn: (id: string) => api.put(`/notifications/${id}/read`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['unread-count'] }); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => api.delete(`/notifications/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['unread-count'] }); } });

  const notifications = data?.pages.flatMap((pg: any) => pg?.notifications || []) || [];
  const unreadCount = data?.pages[0]?.unreadCount || 0;

  const handleNotificationTap = (notif: any) => {
    if (!notif.isRead) markOneReadMutation.mutate(notif._id);
    if (notif.type === 'helpful_vote' && notif.data?.billId) navigate('/profile/history');
    else if (notif.type === 'price_drop' && notif.data?.stationId) navigate(`/station/${notif.data.stationId}`);
    else if (notif.type === 'inactivity_reminder') navigate('/scanner');
  };

  if (!token) {
    return (
      <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-info/10 to-transparent -z-10" />
        <div className="px-4 sm:px-5 pt-6 sm:pt-8 pb-3 sm:pb-4 flex items-center justify-between z-10">
          <button onClick={() => navigate(-1)} className="w-10 h-10 sm:w-11 sm:h-11 bg-surface rounded-full flex items-center justify-center shadow-premium-sm text-textPrimary"><ArrowLeft size={18} /></button>
          <h1 className="font-heading font-bold text-lg sm:text-xl text-textPrimary">{t('notifications.title')}</h1>
          <div className="w-10 h-10 sm:w-11 sm:h-11" />
        </div>
        <div className="flex flex-col items-center justify-center mt-20 px-10">
          <div className="w-20 h-20 bg-avatarBg rounded-full flex items-center justify-center mb-5"><Lock size={40} className="text-primary" /></div>
          <h2 className="font-bold text-xl text-textPrimary mb-2">{t('notifications.loginTitle')}</h2>
          <p className="font-normal text-sm text-textMuted text-center leading-relaxed mb-6">{t('notifications.loginSub')}</p>
          <button onClick={() => navigate('/login?returnTo=' + encodeURIComponent(location.pathname + location.search))} className="btn-primary px-8 py-3.5 rounded-full">{t('auth.signInButton')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-info/10 to-transparent -z-10" />
      <div className="px-4 sm:px-5 pt-6 sm:pt-8 pb-3 sm:pb-4 flex items-center justify-between z-10">
        <button onClick={() => navigate(-1)} className="w-10 h-10 sm:w-11 sm:h-11 bg-surface rounded-full flex items-center justify-center shadow-premium-sm text-textPrimary hover:bg-surfaceMuted transition-colors"><ArrowLeft size={18} /></button>
        <h1 className="font-heading font-bold text-lg sm:text-xl text-textPrimary">{t('notifications.title')}</h1>
        {unreadCount > 0 ? (
          <button onClick={() => markAllReadMutation.mutate()} className="w-11 h-11 bg-surface rounded-full flex items-center justify-center shadow-premium-sm text-primary hover:bg-surfaceMuted transition-colors"><CheckCircle size={18} /></button>
        ) : ( <div className="w-11 h-11" /> )}
      </div>

      {unreadCount > 0 && (
        <div className="mx-5 mb-3 px-4 py-2.5 bg-avatarBg rounded-2xl flex justify-center items-center">
          <span className="font-semibold text-[13px] text-primary">{unreadCount} {unreadCount > 1 ? t('notifications.unreadPlural') : t('notifications.unreadSingular')}</span>
        </div>
      )}

      <div className="flex-1 px-4 sm:px-5 pt-2">
        {isLoading ? (
          <div className="flex justify-center mt-10"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 px-10">
            <div className="w-20 h-20 bg-avatarBg rounded-full flex items-center justify-center mb-5"><BellOff size={40} className="text-primary" /></div>
            <h2 className="font-bold text-xl text-textPrimary mb-2">{t('notifications.noNotificationsYet')}</h2>
            <p className="font-normal text-sm text-textMuted text-center leading-relaxed">{t('notifications.noNotificationsSub')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 stagger-children">
            {notifications.map((notif: any) => {
              const iconConfig = NOTIF_ICON[notif.type] || NOTIF_ICON.general;
              return (
                <button
                  key={notif._id}
                  onClick={() => handleNotificationTap(notif)}
                  className={`reveal premium-card premium-card-hover flex items-start gap-3.5 p-4 text-left transition-all ${
                    !notif.isRead ? 'border-primary/10' : 'opacity-80'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconConfig.bg} ${iconConfig.color}`}>{iconConfig.icon}</div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`font-semibold text-sm text-textPrimary truncate pr-2 ${!notif.isRead ? 'font-bold' : ''}`}>{notif.title}</h3>
                      {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="font-normal text-[13px] text-textMuted leading-[18px] line-clamp-2">{notif.body}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-medium text-[11px] text-textMuted">{getRelativeTime(notif.createdAt)}</span>
                      <div className="p-1.5 text-textMuted/40 hover:text-error transition-colors" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif._id); }}>
                        <Trash2 size={14} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            <div ref={loadMoreRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-4"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
