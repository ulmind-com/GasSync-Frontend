import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Calendar, Droplet, FileText, Loader2, X, Camera, MapPin, Image as ImageIcon } from 'lucide-react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/Toast';

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
  const { showToast } = useToast();
  
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
      showToast(t('history.billDeleted'), 'success');
      setSelectedBill(null);
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || t('common.errorOccurred'), 'error');
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
              <div 
                key={item._id || item.id} 
                onClick={() => setSelectedBill(item)}
                className="bg-white rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col h-full hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#E8F8EC] rounded-full flex items-center justify-center">
                      <Droplet size={18} className="text-[#34C759]" />
                    </div>
                    <div>
                      <span className="block font-semibold text-base text-gray-900">{item.fuelType ? (FUEL_LABELS[item.fuelType] || item.fuelType.charAt(0).toUpperCase() + item.fuelType.slice(1)) : t('history.processing', 'Processing...')}</span>
                      <span className="block font-medium text-sm text-gray-500">{item.stationName || 'Unknown Station'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(item._id || item.id);
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
                    {item.pricePerGallon ? (
                      <span className="block font-bold text-2xl text-gray-900 mb-1">${item.pricePerGallon.toFixed(3)}<span className="text-sm text-gray-500 font-medium">/gal</span></span>
                    ) : item.price ? (
                      <span className="block font-bold text-2xl text-gray-900 mb-1">${item.price.toFixed(2)}</span>
                    ) : (
                      <span className="block font-bold text-xl text-[#FF9500] mb-1">Pending</span>
                    )}
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar size={14} />
                      <span className="font-medium text-xs">{formatDate(item.billDate || item.createdAt)}</span>
                    </div>
                  </div>
                  
                  {item.imageUrl && (
                    <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                      <img src={item.imageUrl} alt="Receipt" className="w-full h-full object-cover" />
                    </div>
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
              onClick={() => navigate('/home')}
              className="bg-[#34C759] hover:bg-[#2EB350] text-white px-8 py-3 rounded-full font-semibold text-base shadow-md transition-colors flex items-center gap-2"
            >
              <Camera size={18} />
              {t('history.scanFirst')}
            </button>
          </div>
        )}
      </div>

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-2xl text-gray-900">{t('history.billDetails', 'Bill Details')}</h2>
                <p className="font-medium text-sm text-gray-500 mt-1">{formatDate(selectedBill?.billDate || selectedBill?.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmDeleteId(selectedBill._id || selectedBill.id)}
                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#FF3B30] hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={() => setSelectedBill(null)}
                  className="w-10 h-10 flex items-center justify-center text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* Station Row */}
              <div 
                className={`flex items-center gap-4 bg-gray-50 p-4 rounded-2xl mb-6 ${selectedBill?.googlePlaceId ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
                onClick={() => {
                  if (selectedBill?.googlePlaceId) {
                    setSelectedBill(null);
                    navigate(`/station/${selectedBill.googlePlaceId}`);
                  }
                }}
              >
                <div className="w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-[#34C759]" />
                </div>
                <div className="flex-1">
                  <span className="block font-semibold text-[15px] text-gray-900">{selectedBill?.stationName || 'Unknown Station'}</span>
                  {selectedBill?.googlePlaceId && (
                    <span className="block font-medium text-xs text-[#34C759] mt-0.5">{t('history.tapToViewStation', 'Tap to view station')} →</span>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6 bg-white border border-gray-100 rounded-3xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="font-medium text-[11px] text-gray-400 uppercase tracking-wider mb-1">{t('history.pricePerGal', 'Price / Gal')}</span>
                  <span className="font-semibold text-[17px] text-gray-900">
                    {selectedBill?.pricePerGallon ? `$${selectedBill.pricePerGallon.toFixed(3)}` : '—'}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center text-center border-x border-gray-100 px-2">
                  <span className="font-medium text-[11px] text-gray-400 uppercase tracking-wider mb-1">{t('history.fuelType', 'Fuel Type')}</span>
                  <span className="font-semibold text-[15px] text-gray-900">
                    {selectedBill?.fuelType ? (FUEL_LABELS[selectedBill.fuelType] || selectedBill.fuelType.charAt(0).toUpperCase() + selectedBill.fuelType.slice(1)) : '—'}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="font-medium text-[11px] text-gray-400 uppercase tracking-wider mb-1">{t('history.gallons', 'Gallons')}</span>
                  <span className="font-semibold text-[17px] text-gray-900">
                    {selectedBill?.gallons ? selectedBill.gallons.toFixed(2) : '—'}
                  </span>
                </div>
              </div>

              {/* Total Amount Row */}
              <div className="flex items-center justify-between p-5 bg-[#F8F9FA] rounded-3xl mb-8">
                <span className="font-medium text-[15px] text-gray-600">{t('history.totalAmount', 'Total Amount')}</span>
                <span className="font-bold text-2xl text-[#34C759]">
                  {selectedBill?.totalAmount ? `$${selectedBill.totalAmount.toFixed(2)}` : '—'}
                </span>
              </div>

              {/* View Receipt Button */}
              {selectedBill?.imageUrl && (
                <button
                  onClick={() => setSelectedImage(selectedBill.imageUrl)}
                  className="w-full flex items-center justify-center gap-2 bg-[#E8F8EC] hover:bg-[#D5F3E0] text-[#34C759] font-semibold text-[15px] py-4 rounded-2xl transition-colors"
                >
                  <ImageIcon size={20} />
                  {t('history.viewReceiptImage', 'View Full Receipt')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 sm:p-8 animate-in fade-in duration-200">
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-md z-10"
          >
            <X size={24} />
          </button>
          <img
            src={selectedImage}
            alt="Receipt Full"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={26} className="text-[#FF3B30]" />
            </div>
            <h3 className="font-bold text-xl text-gray-900 text-center mb-2">
              {t('history.deleteConfirmTitle', 'Delete this upload?')}
            </h3>
            <p className="font-normal text-sm text-gray-500 text-center mb-6 leading-relaxed">
              {t('history.deleteConfirm', 'This will permanently remove this bill and its reported price. This cannot be undone.')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3.5 rounded-2xl font-semibold text-[15px] text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 py-3.5 rounded-2xl font-semibold text-[15px] text-white bg-[#FF3B30] hover:bg-[#E0352B] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending && <Loader2 size={18} className="animate-spin" />}
                {t('history.deleteConfirmBtn', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
