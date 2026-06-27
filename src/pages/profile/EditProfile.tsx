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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast(t('editProfile.errorEmptyName'), 'warning');
      return;
    }

    setUploading(true);
    try {
      // 1. Update Name
      if (displayName !== user?.displayName) {
        await api.put('/auth/me', { displayName });
      }

      // 2. Update Image (if changed)
      if (selectedFile) {
        const formData = new FormData();
        formData.append('avatar', selectedFile);

        await api.post('/auth/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await fetchUser(); // Refresh global user state
      showToast(t('editProfile.success'), 'success');
      navigate(-1);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Something went wrong', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-[#F8FAFC] relative overflow-hidden min-h-[calc(100vh-64px)]">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-[#34C759]/20 to-transparent -z-10" />

      <div className="pt-8 px-6 pb-20 relative z-10 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-gray-800">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-xl text-gray-900">{t('editProfile.title')}</h1>
          <div className="w-11 h-11" />
        </div>

        <form onSubmit={handleSave} className="flex flex-col items-center w-full">
          {/* Avatar Edit */}
          <div className="relative mb-10 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-[120px] h-[120px] rounded-full bg-white shadow-xl flex items-center justify-center overflow-hidden border-4 border-white transition-transform group-hover:scale-105">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-semibold text-5xl text-[#34C759]">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </span>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-10 h-10 bg-[#34C759] rounded-full flex items-center justify-center border-4 border-[#F8FAFC] shadow-md group-hover:bg-[#2EB350] transition-colors">
              <Camera size={18} className="text-white" />
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>
          <p className="font-medium text-sm text-gray-500 mb-8">{t('editProfile.changePicture')}</p>

          {/* Form Fields */}
          <div className="w-full bg-white p-6 rounded-3xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] space-y-6">
            <div>
              <label className="block font-medium text-sm text-gray-700 mb-2 ml-1">{t('editProfile.fullName')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#34C759] focus:ring-1 focus:ring-[#34C759] transition-all font-medium text-gray-900"
                  placeholder="Enter your full name"
                  disabled={uploading}
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-sm text-gray-700 mb-2 ml-1">{t('editProfile.emailAddress')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={20} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full h-14 pl-12 pr-4 bg-gray-100/50 border border-transparent rounded-2xl outline-none text-gray-500 font-medium cursor-not-allowed"
                />
              </div>
              <p className="text-xs font-medium text-gray-400 mt-2 ml-1">{t('editProfile.emailHelper')}</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full h-14 mt-8 bg-[#34C759] hover:bg-[#2EB350] text-white rounded-full font-semibold text-lg flex items-center justify-center shadow-lg shadow-[#34C759]/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              t('common.save')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
