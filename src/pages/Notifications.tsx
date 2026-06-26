import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, BellOff, Lock, ThumbsUp, TrendingDown, Clock, MapPin, Bell, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

const NOTIF_ICON: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  helpful_vote: { icon: <ThumbsUp size={18} />, color: 'text-[#34C759]', bg: 'bg-gradient-to-br from-[#E8F8EC] to-[#D5F3E0]' },
  price_drop: { icon: <TrendingDown size={18} />, color: 'text-[#208AEF]', bg: 'bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB]' },
  inactivity_reminder: { icon: <Clock size={18} />, color: 'text-[#FF9500]', bg: 'bg-gradient-to-br from-[#FFF3E0] to-[#FFE0B2]' },
  location_reminder: { icon: <MapPin size={18} />, color: 'text-[#AF52DE]', bg: 'bg-gradient-to-br from-[#F3E5F5] to-[#E1BEE7]' },
  general: { icon: <Bell size={18} />, color: 'text-[#636366]', bg: 'bg-gradient-to-br from-[#F2F2F7] to-[#E5E5EA]' },
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
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications?limit=50');
      return res.data?.data;
    },
    enabled: !!token,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put('/notifications/mark-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markOneReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const handleNotificationTap = (notif: any) => {
    if (!notif.isRead) {
      markOneReadMutation.mutate(notif._id);
    }
    if (notif.type === 'helpful_vote' && notif.data?.billId) {
      navigate('/profile/history');
    } else if (notif.type === 'price_drop' && notif.data?.stationId) {
      navigate(`/station/${notif.data.stationId}`);
    } else if (notif.type === 'inactivity_reminder') {
      navigate('/scanner');
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F8FAFC] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-[#208AEF]/20 to-transparent -z-10" />
        <div className="px-5 pt-8 pb-4 flex items-center justify-between z-10">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-gray-800">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-xl text-gray-900">{t('notifications.title')}</h1>
          <div className="w-11 h-11" />
        </div>
        <div className="flex flex-col items-center justify-center mt-20 px-10">
          <div className="w-20 h-20 bg-[#E8F8EC] rounded-full flex items-center justify-center mb-5">
            <Lock size={40} className="text-[#34C759]" />
          </div>
          <h2 className="font-bold text-xl text-gray-900 mb-2">{t('common.loginToContinue')}</h2>
          <p className="font-normal text-sm text-gray-500 text-center leading-relaxed mb-6">
            Log in to receive notifications about price drops, helpful votes, and more.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="bg-[#34C759] px-8 py-3.5 rounded-full font-semibold text-[15px] text-white shadow-md hover:bg-[#2EB350] transition-colors"
          >
            {t('auth.signInButton')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] pb-24 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-[#208AEF]/20 to-transparent -z-10" />

      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between z-10">
        <button onClick={() => navigate(-1)} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-gray-800 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-xl text-gray-900">{t('notifications.title')}</h1>
        {unreadCount > 0 ? (
          <button 
            onClick={() => markAllReadMutation.mutate()} 
            className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-[#34C759] hover:bg-gray-50 transition-colors"
          >
            <CheckCircle size={18} />
          </button>
        ) : (
          <div className="w-11 h-11" />
        )}
      </div>

      {/* Unread banner */}
      {unreadCount > 0 && (
        <div className="mx-5 mb-3 px-4 py-2.5 bg-[#E8F8EC] rounded-2xl flex justify-center items-center">
          <span className="font-semibold text-[13px] text-[#34C759]">
            {unreadCount} {unreadCount > 1 ? t('notifications.unreadPlural') : t('notifications.unreadSingular')}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-5 pt-2">
        {isLoading ? (
          <div className="flex justify-center mt-10">
            <div className="w-8 h-8 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 px-10">
            <div className="w-20 h-20 bg-[#E8F8EC] rounded-full flex items-center justify-center mb-5">
              <BellOff size={40} className="text-[#34C759]" />
            </div>
            <h2 className="font-bold text-xl text-gray-900 mb-2">{t('notifications.noNotificationsYet')}</h2>
            <p className="font-normal text-sm text-gray-500 text-center leading-relaxed">
              {t('notifications.noNotificationsSub')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((notif: any) => {
              const iconConfig = NOTIF_ICON[notif.type] || NOTIF_ICON.general;
              
              return (
                <button
                  key={notif._id}
                  onClick={() => handleNotificationTap(notif)}
                  className={`flex items-start gap-3.5 rounded-[18px] p-4 text-left transition-all ${
                    !notif.isRead 
                      ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#34C759]/10' 
                      : 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-gray-50 opacity-80'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconConfig.bg} ${iconConfig.color}`}>
                    {iconConfig.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`font-semibold text-sm text-gray-900 truncate pr-2 ${!notif.isRead ? 'font-bold' : ''}`}>
                        {notif.title}
                      </h3>
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full bg-[#34C759] shrink-0" />
                      )}
                    </div>
                    <p className="font-normal text-[13px] text-gray-500 leading-[18px] line-clamp-2">
                      {notif.body}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-medium text-[11px] text-gray-400">
                        {getRelativeTime(notif.createdAt)}
                      </span>
                      <div 
                        className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notif._id);
                        }}
                      >
                        <Trash2 size={14} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
