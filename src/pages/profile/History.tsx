import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Calendar, Droplet, FileText, Loader2, X } from 'lucide-react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';

const FUEL_LABELS: Record<string, string> = {
  regular: 'Regular 87',
  midgrade: 'Plus 89',
  premium: 'Premium 93',
  diesel: 'Diesel',
  e85: 'E85 Flex',
  unl88: 'UNL 88',
};

export default function History() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: billsData, isLoading } = useQuery({
    queryKey: ['my-bills'],
    queryFn: async () => {
      const res = await api.get('/bills');
      return res.data;
    },
    enabled: !!token,
  });

  const deleteMutation = useMutation({
    mutationFn: async (billId: string) => {
      if (!token) throw new Error('NOT_AUTHENTICATED');
      const res = await api.delete(`/bills/${billId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill-stats'] });
      queryClient.invalidateQueries({ queryKey: ['station-prices'] });
      alert(t('history.billDeleted'));
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || t('common.errorOccurred'));
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('history.recently');
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return t('history.recently');
    
    const day = d.getDate();
    const getSuffix = (n: number) => {
      if (n >= 11 && n <= 13) return 'th';
      switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    const month = d.toLocaleString('en-US', { month: 'long' });
    const year = d.getFullYear();
    
    return `${day}${getSuffix(day)} ${month} ${year}`;
  };

  const bills = Array.isArray(billsData?.data) ? billsData.data : [];

  return (
    <div className="flex flex-col flex-1 bg-[#F8FAFC] relative min-h-[calc(100vh-64px)]">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-[#208AEF]/20 to-transparent -z-10" />

      <div className="pt-8 px-6 pb-20 relative z-10 max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-gray-800 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-xl text-gray-900">{t('profile.myUploads')}</h1>
          <div className="w-11 h-11" />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="text-[#34C759] animate-spin mb-4" />
            <p className="font-medium text-gray-500">Loading your history...</p>
          </div>
        ) : bills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bills.map((item: any) => (
              <div key={item._id || item.id} className="bg-white rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col h-full hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#E8F8EC] rounded-full flex items-center justify-center">
                      <Droplet size={18} className="text-[#34C759]" />
                    </div>
                    <div>
                      <span className="block font-semibold text-base text-gray-900">{FUEL_LABELS[item.fuelType] || item.fuelType}</span>
                      <span className="block font-medium text-sm text-gray-500">{item.stationName}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm(t('history.deleteConfirm'))) {
                        deleteMutation.mutate(item._id || item.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-[#FF3B30] hover:bg-red-50 rounded-full transition-colors"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === (item._id || item.id) ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>

                <div className="flex justify-between items-end mt-auto">
                  <div>
                    <span className="block font-bold text-2xl text-gray-900 mb-1">${item.price?.toFixed(2)}</span>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar size={14} />
                      <span className="font-medium text-xs">{formatDate(item.billDate || item.createdAt)}</span>
                    </div>
                  </div>
                  
                  {item.imageUrl && (
                    <button 
                      onClick={() => setSelectedImage(item.imageUrl)}
                      className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden shadow-sm hover:opacity-80 transition-opacity"
                    >
                      <img src={item.imageUrl} alt="Receipt" className="w-full h-full object-cover" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center bg-white rounded-3xl p-10 shadow-[0_4px_12px_rgba(0,0,0,0.03)] mt-8">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-5">
              <FileText size={32} className="text-gray-300" />
            </div>
            <h2 className="font-semibold text-xl text-gray-900 mb-2">{t('history.noUploads')}</h2>
            <p className="font-medium text-gray-500 text-center max-w-sm mb-6">{t('history.noUploadsSub')}</p>
            <button 
              onClick={() => navigate('/scanner')}
              className="bg-[#34C759] hover:bg-[#2EB350] text-white px-8 py-3 rounded-full font-semibold text-base shadow-md transition-colors flex items-center gap-2"
            >
              <Camera size={18} />
              {t('history.scanFirst')}
            </button>
          </div>
        )}
      </div>

      {/* Full Screen Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-md"
          >
            <X size={24} />
          </button>
          <img 
            src={selectedImage} 
            alt="Receipt Full" 
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
