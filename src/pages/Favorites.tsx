import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Star } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getPhotoUrl } from '../lib/overpass';
import { SpotlightCard } from '../components/CursorEffects';

export default function Favorites() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const favorites = user?.favorites || [];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-info/10 to-transparent -z-10" />

      <div className="px-6 pt-10 relative z-10">
        <h1 className="reveal font-heading font-bold text-2xl text-textPrimary mb-2">{t('favorites.title')}</h1>
        <p className="reveal font-normal text-sm text-textSecondary mb-8">Your saved gas stations will appear here.</p>

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="w-20 h-20 bg-avatarBg rounded-full flex items-center justify-center mb-6">
              <Heart size={32} className="text-primary" />
            </div>
            <h2 className="font-semibold text-lg text-textPrimary mb-2">{t('favorites.noFavorites')}</h2>
            <p className="font-normal text-sm text-textMuted text-center px-8">
              {t('favorites.noFavoritesSub')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 stagger-children">
            {favorites.map((station: any) => (
              <SpotlightCard
                key={station.id}
                className="reveal premium-card premium-card-hover cursor-pointer"
                spotlightColor="rgb(var(--color-primary) / 0.05)"
              >
              <button
                onClick={() => navigate(`/station/${station.id}`)}
                className="flex flex-row p-3 items-center text-left w-full"
              >
                {station.photoRef ? (
                  <img src={getPhotoUrl(station.photoRef, 200)} alt={station.name} className="w-16 h-16 rounded-xl mr-4 object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-avatarBg flex items-center justify-center mr-4 shrink-0">
                    <MapPin size={24} className="text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-semibold text-base text-textPrimary mb-1 truncate">{station.name}</h3>
                  <p className="font-normal text-[13px] text-textMuted truncate mb-1.5">{station.address}</p>
                  {station.rating > 0 && (
                    <div className="flex items-center">
                      <Star size={14} className="text-warning fill-warning mr-1" />
                      <span className="font-medium text-[13px] text-textPrimary">{station.rating}</span>
                      <span className="font-normal text-xs text-textMuted ml-1">({station.totalRatings})</span>
                    </div>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                  <Heart size={18} className="text-error fill-error" />
                </div>
              </button>
              </SpotlightCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
