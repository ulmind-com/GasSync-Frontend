import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { api } from '../../lib/axios';
import { useToast } from '../../components/Toast';

export default function ChangePassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) { showToast(t('common.errorOccurred'), 'warning'); return; }
    if (newPassword !== confirmPassword) { showToast(t('changePassword.errorMismatch'), 'warning'); return; }
    if (newPassword.length < 6) { showToast(t('changePassword.errorLength'), 'warning'); return; }
    setLoading(true);
    try { await api.put('/auth/update-password', { currentPassword, newPassword }); showToast(t('changePassword.success'), 'success'); navigate(-1); }
    catch (error: any) { showToast(error.response?.data?.message || t('changePassword.errorFailed'), 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col flex-1 bg-background relative overflow-hidden min-h-[calc(100vh-64px)]">
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-[#AF52DE]/15 to-transparent -z-10" />
      <div className="pt-8 px-6 pb-20 relative z-10 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-surface rounded-full flex items-center justify-center shadow-premium-sm text-textPrimary hover:bg-surfaceMuted transition-colors"><ArrowLeft size={20} /></button>
          <h1 className="font-semibold text-xl text-textPrimary">{t('changePassword.title')}</h1>
          <div className="w-11 h-11" />
        </div>
        <form onSubmit={handleSave} className="flex flex-col w-full">
          <div className="w-full premium-card p-6 space-y-6">
            {[
              { label: t('changePassword.currentPassword'), value: currentPassword, setter: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(!showCurrent), placeholder: 'Enter current password' },
              { label: t('changePassword.newPassword'), value: newPassword, setter: setNewPassword, show: showNew, toggle: () => setShowNew(!showNew), placeholder: 'Enter new password' },
              { label: t('changePassword.confirmPassword'), value: confirmPassword, setter: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(!showConfirm), placeholder: 'Confirm new password' },
            ].map((field, idx) => (
              <div key={idx}>
                <label className="block font-medium text-sm text-textSecondary mb-2 ml-1">{field.label}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock size={20} className="text-textMuted" /></div>
                  <input type={field.show ? "text" : "password"} value={field.value} onChange={(e) => field.setter(e.target.value)} className="w-full h-14 pl-12 pr-12 bg-surfaceMuted border border-border rounded-2xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-textPrimary" placeholder={field.placeholder} disabled={loading} />
                  <button type="button" onClick={field.toggle} className="absolute inset-y-0 right-0 pr-4 flex items-center text-textMuted hover:text-textSecondary">{field.show ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </div>
              </div>
            ))}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full h-14 mt-8 rounded-full text-lg disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? <Loader2 size={24} className="animate-spin" /> : t('common.save')}
          </button>
        </form>
      </div>
    </div>
  );
}
