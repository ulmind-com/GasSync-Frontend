import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit2, User, MapPin, FileText, Lock, Globe, Moon, MessageCircle, Share2, Info, HelpCircle, LogOut, ChevronRight, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { api } from '../lib/axios';
import { useToast } from '../components/Toast';
import { SpotlightCard } from '../components/CursorEffects';

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
      try { await navigator.share({ title: 'GasSync', text: 'Check out GasSync to find the best gas prices and track your expenses!', url: 'https://gassync.app' }); }
      catch (error) { console.log('Error sharing app:', error); }
    } else { showToast('Share: https://gassync.app', 'info'); }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const handleLogout = async () => { await logout(); navigate('/home', { replace: true }); };

  const confirmDeleteAccount = () => {
    api.delete('/auth/account')
      .then(() => { queryClient.clear(); logout(); navigate('/home'); showToast(t('common.deleted') || 'Account deleted successfully', 'success'); setShowDeleteModal(false); })
      .catch((e: any) => { showToast(e.response?.data?.message || t('common.deleteFailed') || 'Failed to delete account. Please try again.', 'error'); setShowDeleteModal(false); });
  };

  return (
    <div className="flex flex-col flex-1 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[350px] bg-gradient-to-b from-info/10 to-transparent -z-10" />

      <div className="pt-8 px-6 pb-20 relative z-10 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/home')} className="w-11 h-11 bg-surface rounded-full flex items-center justify-center shadow-premium-sm text-textPrimary"><ArrowLeft size={20} /></button>
          <h1 className="font-semibold text-xl text-textPrimary">{t('profile.title')}</h1>
          <div className="w-11 h-11" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24"><div className="w-9 h-9 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : token && user ? (
          <div className="premium-card p-5 mb-8 flex items-center justify-between">
            <div className="flex items-center flex-1 pr-4">
              <div className="w-[60px] h-[60px] rounded-full bg-avatarBg flex items-center justify-center overflow-hidden shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-semibold text-2xl text-primary">{user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</span>
                )}
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <h2 className="font-semibold text-lg text-textPrimary mb-0.5 truncate">{user.displayName}</h2>
                <p className="font-normal text-sm text-textMuted truncate">{user.email}</p>
              </div>
            </div>
            <button onClick={() => navigate('/profile/edit')} className="p-2 text-textMuted hover:text-textPrimary transition-colors"><Edit2 size={20} /></button>
          </div>
        ) : (
          <div className="flex flex-col items-center mt-2 mb-8 px-6">
            <div className="w-20 h-20 rounded-full bg-avatarBg flex items-center justify-center mb-4"><User size={40} className="text-primary" /></div>
            <h2 className="font-semibold text-2xl text-textPrimary mb-2">{t('profile.guestTitle')}</h2>
            <p className="font-normal text-[15px] text-textMuted mb-8 text-center">{t('profile.guestSubtitle')}</p>
            <button onClick={() => navigate('/login?returnTo=' + encodeURIComponent(location.pathname + location.search))} className="btn-primary w-full h-14 rounded-full text-lg">{t('profile.signIn')}</button>
          </div>
        )}

        {/* General Section */}
        <div className="reveal mb-6">
          <h3 className="font-heading font-semibold text-base text-textPrimary mb-3 ml-2">{t('profile.general')}</h3>
          <SpotlightCard className="premium-card" spotlightColor="rgb(var(--color-primary) / 0.04)">
          <div className="py-2 px-5 flex flex-col">
            <MenuItem icon={<MapPin size={20} className="text-textMuted" />} label={t('profile.location')} onClick={() => navigate('/location-search')} />
            <div className="h-px bg-border w-full" />
            <MenuItem icon={<FileText size={20} className="text-textMuted" />} label={t('profile.myUploads')} onClick={() => navigate('/profile/history')} />
            {token && user && (<><div className="h-px bg-border w-full" /><MenuItem icon={<Lock size={20} className="text-textMuted" />} label={t('profile.changePassword')} onClick={() => navigate('/profile/change-password')} /></>)}
            <div className="h-px bg-border w-full" />
            <MenuItem icon={<Globe size={20} className="text-textMuted" />} label={t('profile.language')} onClick={() => navigate('/profile/language')} />
            <div className="h-px bg-border w-full" />
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4"><Moon size={20} className="text-textMuted" /><span className="font-medium text-base text-textPrimary">{t('profile.darkMode')}</span></div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" value="" className="sr-only peer" checked={isDark} onChange={toggleTheme} />
                <div className="w-11 h-6 bg-surfaceMuted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
          </SpotlightCard>
        </div>

        {/* Support Section */}
        <div className="reveal mb-6">
          <h3 className="font-heading font-semibold text-base text-textPrimary mb-3 ml-2">{t('profile.support')}</h3>
          <SpotlightCard className="premium-card" spotlightColor="rgb(var(--color-info) / 0.04)">
          <div className="py-2 px-5 flex flex-col">
            <MenuItem icon={<MessageCircle size={20} className="text-textMuted" />} label={t('profile.feedback')} onClick={() => navigate('/profile/feedback')} />
            <div className="h-px bg-border w-full" />
            <MenuItem icon={<Share2 size={20} className="text-textMuted" />} label={t('profile.share')} onClick={handleShare} />
            <div className="h-px bg-border w-full" />
            <MenuItem icon={<Info size={20} className="text-textMuted" />} label={t('howToUse.title')} onClick={() => navigate('/profile/how-to-use')} />
            <div className="h-px bg-border w-full" />
            <MenuItem icon={<HelpCircle size={20} className="text-textMuted" />} label={t('profile.help')} onClick={() => navigate('/profile/help')} />
          </div>
          </SpotlightCard>
        </div>

        {token && user && (
          <button onClick={handleLogout} className="w-full premium-card py-4 px-5 flex items-center hover:bg-error/5 transition-colors mb-3">
            <LogOut size={20} className="text-error" /><span className="font-semibold text-base text-error ml-4">{t('profile.logOut')}</span>
          </button>
        )}

        {token && user && (
          <button onClick={() => setShowDeleteModal(true)} className="w-full premium-card py-4 px-5 flex items-center hover:bg-error/5 transition-colors">
            <Trash2 size={20} className="text-error" /><span className="font-semibold text-base text-error ml-4">{t('profile.deleteAccount')}</span>
          </button>
        )}

        <a href="https://ulmind.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center mt-10 mb-5 group">
          <span className="font-medium text-[13px] text-textMuted mr-1.5 group-hover:text-textSecondary transition-colors">Powered by</span>
          <img src="/ulmind.png" alt="Ulmind" className="h-6 object-contain opacity-85 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 premium-modal-backdrop animate-in fade-in duration-200" onClick={() => setShowDeleteModal(false)} />
          <div className="premium-modal p-6 w-full max-w-sm relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-[22px] font-semibold text-textPrimary mb-2">{t('profile.deleteAccountTitle') || 'Delete Account?'}</h3>
            <p className="text-[15px] text-textMuted mb-8 leading-relaxed">{t('profile.deleteAccountMsg') || 'This permanently deletes your account and all your data. This cannot be undone.'}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3.5 px-4 bg-surfaceMuted active:bg-surfaceMuted/80 text-info font-semibold text-[17px] rounded-2xl transition-colors">{t('common.cancel') || 'Cancel'}</button>
              <button onClick={confirmDeleteAccount} className="flex-1 py-3.5 px-4 bg-error active:bg-error/90 text-white font-semibold text-[17px] rounded-2xl transition-colors shadow-sm">{t('profile.deleteAccountConfirm') || 'Delete'}</button>
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
      <div className="flex items-center gap-4">{icon}<span className="font-medium text-base text-textPrimary">{label}</span></div>
      <ChevronRight size={20} className="text-textMuted group-hover:translate-x-1 transition-transform" />
    </button>
  );
}
