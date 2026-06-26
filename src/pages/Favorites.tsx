import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Star } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getPhotoUrl } from '../lib/overpass';

export default function Favorites() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const favorites = user?.favorites || [];

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] pb-24 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-[#208AEF]/20 to-transparent -z-10" />

      <div className="px-6 pt-10 relative z-10">
        <h1 className="font-bold text-2xl text-gray-900 mb-2">{t('favorites.title')}</h1>
        <p className="font-normal text-sm text-gray-500 mb-8">Your saved gas stations will appear here.</p>

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20">
            <div className="w-20 h-20 bg-[#E8F8EC] rounded-full flex items-center justify-center mb-6">
              <Heart size={32} className="text-[#34C759]" />
            </div>
            <h2 className="font-semibold text-lg text-gray-900 mb-2">{t('favorites.noFavorites')}</h2>
            <p className="font-normal text-sm text-gray-500 text-center px-8">
              {t('favorites.noFavoritesSub')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {favorites.map((station: any) => (
              <button
                key={station.id}
                onClick={() => navigate(`/station/${station.id}`)}
                className="flex flex-row bg-white rounded-2xl p-3 items-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-left hover:shadow-md transition-shadow"
              >
                {station.photoRef ? (
                  <img 
                    src={getPhotoUrl(station.photoRef, 200)} 
                    alt={station.name}
                    className="w-16 h-16 rounded-xl mr-4 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#E8F8EC] flex items-center justify-center mr-4 shrink-0">
                    <MapPin size={24} className="text-[#34C759]" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-semibold text-base text-gray-900 mb-1 truncate">{station.name}</h3>
                  <p className="font-normal text-[13px] text-gray-500 truncate mb-1.5">{station.address}</p>
                  {station.rating > 0 && (
                    <div className="flex items-center">
                      <Star size={14} className="text-[#FF9500] fill-[#FF9500] mr-1" />
                      <span className="font-medium text-[13px] text-gray-900">{station.rating}</span>
                      <span className="font-normal text-xs text-gray-500 ml-1">({station.totalRatings})</span>
                    </div>
                  )}
                </div>
                
                <div className="w-10 h-10 rounded-full bg-[#FFF5F5] flex items-center justify-center shrink-0">
                  <Heart size={18} className="text-[#FF3B30] fill-[#FF3B30]" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
