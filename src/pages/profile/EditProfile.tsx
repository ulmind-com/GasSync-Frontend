import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Camera, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/axios';
import { useToast } from '../../components/Toast';

export default function EditProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, fetchUser } = useAuthStore();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) { const file = e.target.files[0]; setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); } };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { showToast(t('editProfile.errorEmptyName'), 'warning'); return; }
    setUploading(true);
    try {
      if (displayName !== user?.displayName) await api.put('/auth/me', { displayName });
      if (selectedFile) { const formData = new FormData(); formData.append('avatar', selectedFile); await api.post('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); }
      await fetchUser(); showToast(t('editProfile.success'), 'success'); navigate(-1);
    } catch (error: any) { showToast(error.response?.data?.message || 'Something went wrong', 'error'); }
    finally { setUploading(false); }
  };

  return (
    <div className="flex flex-col flex-1 bg-background relative overflow-hidden min-h-[calc(100vh-64px)]">
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-primary/10 to-transparent -z-10" />
      <div className="pt-8 px-6 pb-20 relative z-10 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-surface rounded-full flex items-center justify-center shadow-premium-sm text-textPrimary"><ArrowLeft size={20} /></button>
          <h1 className="font-semibold text-xl text-textPrimary">{t('editProfile.title')}</h1>
          <div className="w-11 h-11" />
        </div>
        <form onSubmit={handleSave} className="flex flex-col items-center w-full">
          <div className="relative mb-10 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-[120px] h-[120px] rounded-full bg-surface shadow-premium-lg flex items-center justify-center overflow-hidden border-4 border-surface transition-transform group-hover:scale-105">
              {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : user?.avatarUrl ? <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" /> : <span className="font-semibold text-5xl text-primary">{user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</span>}
            </div>
            <div className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center border-4 border-background shadow-md group-hover:bg-primary-strong transition-colors"><Camera size={18} className="text-white" /></div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
          </div>
          <p className="font-medium text-sm text-textMuted mb-8">{t('editProfile.changePicture')}</p>
          <div className="w-full premium-card p-6 space-y-6">
            <div>
              <label className="block font-medium text-sm text-textSecondary mb-2 ml-1">{t('editProfile.fullName')}</label>
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User size={20} className="text-textMuted" /></div>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full h-14 pl-12 pr-4 bg-surfaceMuted border border-border rounded-2xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-textPrimary" placeholder="Enter your full name" disabled={uploading} />
              </div>
            </div>
            <div>
              <label className="block font-medium text-sm text-textSecondary mb-2 ml-1">{t('editProfile.emailAddress')}</label>
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail size={20} className="text-textMuted" /></div>
                <input type="email" value={user?.email || ''} disabled className="w-full h-14 pl-12 pr-4 bg-surfaceMuted/50 border border-transparent rounded-2xl outline-none text-textMuted font-medium cursor-not-allowed" />
              </div>
              <p className="text-xs font-medium text-textMuted mt-2 ml-1">{t('editProfile.emailHelper')}</p>
            </div>
          </div>
          <button type="submit" disabled={uploading} className="btn-primary w-full h-14 mt-8 rounded-full text-lg disabled:opacity-70 disabled:cursor-not-allowed">
            {uploading ? <Loader2 size={24} className="animate-spin" /> : t('common.save')}
          </button>
        </form>
      </div>
    </div>
  );
}
