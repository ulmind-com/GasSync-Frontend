import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit2, User, MapPin, FileText, Lock, Globe, Moon, MessageCircle, Share2, Info, HelpCircle, LogOut, ChevronRight, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { api } from '../lib/axios';
import { useToast } from '../components/Toast';

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  const { user, token, isLoading, logout, fetchUser } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GasSync',
          text: 'Check out GasSync to find the best gas prices and track your expenses!',
          url: 'https://gassync.app',
        });
      } catch (error) {
        console.log('Error sharing app:', error);
      }
    } else {
      // Fallback
      showToast('Share: https://gassync.app', 'info');
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/home', { replace: true });
  };

  const confirmDeleteAccount = () => {
    api.delete('/auth/account')
      .then(() => {
        queryClient.clear();
        logout();
        navigate('/home');
        showToast(t('common.deleted') || 'Account deleted successfully', 'success');
        setShowDeleteModal(false);
      })
      .catch((e: any) => {
        showToast(e.response?.data?.message || t('common.deleteFailed') || 'Failed to delete account. Please try again.', 'error');
        setShowDeleteModal(false);
      });
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };


  return (
    <div className="flex flex-col flex-1 bg-[#F8FAFC] relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[350px] bg-gradient-to-b from-[#208AEF]/20 to-transparent -z-10" />

      <div className="pt-8 px-6 pb-20 relative z-10 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/home')} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-gray-800">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-xl text-gray-900">{t('profile.title')}</h1>
          <div className="w-11 h-11" /> {/* Spacer */}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-9 h-9 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : token && user ? (
          <div className="bg-white rounded-3xl p-5 mb-8 flex items-center justify-between shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-center flex-1 pr-4">
              <div className="w-[60px] h-[60px] rounded-full bg-[#E8F8EC] flex items-center justify-center overflow-hidden shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-semibold text-2xl text-[#34C759]">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <h2 className="font-semibold text-lg text-gray-900 mb-0.5 truncate">{user.displayName}</h2>
                <p className="font-normal text-sm text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <button onClick={() => navigate('/profile/edit')} className="p-2 text-gray-500 hover:text-gray-900 transition-colors">
              <Edit2 size={20} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center mt-2 mb-8 px-6">
            <div className="w-20 h-20 rounded-full bg-[#E8F8EC] flex items-center justify-center mb-4">
              <User size={40} className="text-[#34C759]" />
            </div>
            <h2 className="font-semibold text-2xl text-gray-900 mb-2">{t('profile.guestTitle')}</h2>
            <p className="font-normal text-[15px] text-gray-500 mb-8 text-center">{t('profile.guestSubtitle')}</p>
            <button 
              onClick={() => navigate('/login?returnTo=' + encodeURIComponent(location.pathname + location.search))}
              className="w-full h-14 bg-[#34C759] rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md hover:bg-[#2EB350] transition-colors"
            >
              {t('profile.signIn')}
            </button>
          </div>
        )}

        {/* General Section */}
        <div className="mb-6">
          <h3 className="font-semibold text-base text-gray-900 mb-3 ml-2">{t('profile.general')}</h3>
          <div className="bg-white rounded-3xl py-2 px-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col">
            <MenuItem icon={<MapPin size={20} className="text-gray-500" />} label={t('profile.location')} onClick={() => navigate('/location-search')} />
            <div className="h-px bg-gray-100 w-full" />
            <MenuItem icon={<FileText size={20} className="text-gray-500" />} label={t('profile.myUploads')} onClick={() => navigate('/profile/history')} />
            
            {token && user && (
              <>
                <div className="h-px bg-gray-100 w-full" />
                <MenuItem icon={<Lock size={20} className="text-gray-500" />} label={t('profile.changePassword')} onClick={() => navigate('/profile/change-password')} />
              </>
            )}
            
            <div className="h-px bg-gray-100 w-full" />
            <MenuItem icon={<Globe size={20} className="text-gray-500" />} label={t('profile.language')} onClick={() => navigate('/profile/language')} />
            
            <div className="h-px bg-gray-100 w-full" />
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <Moon size={20} className="text-gray-500" />
                <span className="font-medium text-base text-gray-900">{t('profile.darkMode')}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" value="" className="sr-only peer" checked={isDark} onChange={toggleTheme} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#34C759]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="mb-6">
          <h3 className="font-semibold text-base text-gray-900 mb-3 ml-2">{t('profile.support')}</h3>
          <div className="bg-white rounded-3xl py-2 px-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col">
            <MenuItem icon={<MessageCircle size={20} className="text-gray-500" />} label={t('profile.feedback')} onClick={() => navigate('/profile/feedback')} />
            <div className="h-px bg-gray-100 w-full" />
            <MenuItem icon={<Share2 size={20} className="text-gray-500" />} label={t('profile.share')} onClick={handleShare} />
            <div className="h-px bg-gray-100 w-full" />
            <MenuItem icon={<Info size={20} className="text-gray-500" />} label={t('howToUse.title')} onClick={() => navigate('/profile/how-to-use')} />
            <div className="h-px bg-gray-100 w-full" />
            <MenuItem icon={<HelpCircle size={20} className="text-gray-500" />} label={t('profile.help')} onClick={() => navigate('/profile/help')} />
          </div>
        </div>

        {/* Logout */}
        {token && user && (
          <button 
            onClick={handleLogout}
            className="w-full bg-white rounded-3xl py-4 px-5 flex items-center shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:bg-red-50 transition-colors mb-3"
          >
            <LogOut size={20} className="text-[#FF3B30]" />
            <span className="font-semibold text-base text-[#FF3B30] ml-4">{t('profile.logOut')}</span>
          </button>
        )}

        {/* Delete account */}
        {token && user && (
          <button 
            onClick={handleDeleteAccount}
            className="w-full bg-white rounded-3xl py-4 px-5 flex items-center shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:bg-red-50 transition-colors"
          >
            <Trash2 size={20} className="text-[#FF3B30]" />
            <span className="font-semibold text-base text-[#FF3B30] ml-4">{t('profile.deleteAccount')}</span>
          </button>
        )}

        {/* Powered By */}
        <a 
          href="https://ulmind.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center mt-10 mb-5 group"
        >
          <span className="font-medium text-[13px] text-gray-500 mr-1.5 group-hover:text-gray-700 transition-colors">Powered by</span>
          <img src="/ulmind.png" alt="Ulmind" className="h-6 object-contain opacity-85 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setShowDeleteModal(false)} />
          <div className="bg-white rounded-[28px] p-6 w-full max-w-sm relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-[22px] font-semibold text-gray-900 mb-2">{t('profile.deleteAccountTitle') || 'Delete Account?'}</h3>
            <p className="text-[15px] text-gray-500 mb-8 leading-relaxed">
              {t('profile.deleteAccountMsg') || 'This permanently deletes your account and all your data. This cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3.5 px-4 bg-[#F2F2F7] active:bg-[#E5E5EA] text-[#007AFF] font-semibold text-[17px] rounded-2xl transition-colors"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button 
                onClick={confirmDeleteAccount}
                className="flex-1 py-3.5 px-4 bg-[#FF3B30] active:bg-[#D92F26] text-white font-semibold text-[17px] rounded-2xl transition-colors shadow-sm"
              >
                {t('profile.deleteAccountConfirm') || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between py-4 w-full text-left group">
      <div className="flex items-center gap-4">
        {icon}
        <span className="font-medium text-base text-gray-900">{label}</span>
      </div>
      <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
    </button>
  );
}
