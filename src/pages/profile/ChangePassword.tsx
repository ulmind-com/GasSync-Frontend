import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { api } from '../../lib/axios';

export default function ChangePassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert(t('common.errorOccurred')); // General error, matching mobile alert logic
      return;
    }

    if (newPassword !== confirmPassword) {
      alert(t('changePassword.errorMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      alert(t('changePassword.errorLength'));
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/update-password', {
        currentPassword,
        newPassword
      });
      alert(t('changePassword.success'));
      navigate(-1);
    } catch (error: any) {
      alert(error.response?.data?.message || t('changePassword.errorFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-[#F8FAFC] relative overflow-hidden min-h-[calc(100vh-64px)]">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-[#AF52DE]/20 to-transparent -z-10" />

      <div className="pt-8 px-6 pb-20 relative z-10 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-gray-800 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-xl text-gray-900">{t('changePassword.title')}</h1>
          <div className="w-11 h-11" />
        </div>

        <form onSubmit={handleSave} className="flex flex-col w-full">
          <div className="w-full bg-white p-6 rounded-3xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] space-y-6">
            
            {/* Current Password */}
            <div>
              <label className="block font-medium text-sm text-gray-700 mb-2 ml-1">{t('changePassword.currentPassword')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={20} className="text-gray-400" />
                </div>
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-14 pl-12 pr-12 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#34C759] focus:ring-1 focus:ring-[#34C759] transition-all font-medium text-gray-900"
                  placeholder="Enter current password"
                  disabled={loading}
                />
                <button 
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block font-medium text-sm text-gray-700 mb-2 ml-1">{t('changePassword.newPassword')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={20} className="text-gray-400" />
                </div>
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-14 pl-12 pr-12 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#34C759] focus:ring-1 focus:ring-[#34C759] transition-all font-medium text-gray-900"
                  placeholder="Enter new password"
                  disabled={loading}
                />
                <button 
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block font-medium text-sm text-gray-700 mb-2 ml-1">{t('changePassword.confirmPassword')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={20} className="text-gray-400" />
                </div>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-14 pl-12 pr-12 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#34C759] focus:ring-1 focus:ring-[#34C759] transition-all font-medium text-gray-900"
                  placeholder="Confirm new password"
                  disabled={loading}
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 mt-8 bg-[#34C759] hover:bg-[#2EB350] text-white rounded-full font-semibold text-lg flex items-center justify-center shadow-lg shadow-[#34C759]/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
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
