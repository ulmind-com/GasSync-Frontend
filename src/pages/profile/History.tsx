import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Calendar, Droplet, FileText, Loader2, X, Camera, MapPin, Image as ImageIcon } from 'lucide-react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/Toast';

const FUEL_LABELS: Record<string, string> = {
  regular: 'Regular 87', midgrade: 'Plus 89', premium: 'Premium 93',
  diesel: 'Diesel', e85: 'E85 Flex', unl88: 'UNL 88',
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

  const { data: billsData, isLoading } = useQuery({ queryKey: ['my-bills'], queryFn: async () => { const res = await api.get('/bills'); return res.data; }, enabled: !!token });
  const deleteMutation = useMutation({
    mutationFn: async (billId: string) => { if (!token) throw new Error('NOT_AUTHENTICATED'); return (await api.delete(`/bills/${billId}`)).data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-bills'] }); queryClient.invalidateQueries({ queryKey: ['bill-stats'] }); queryClient.invalidateQueries({ queryKey: ['station-prices'] }); showToast(t('history.billDeleted'), 'success'); setSelectedBill(null); },
    onError: (error: any) => { showToast(error.response?.data?.message || t('common.errorOccurred'), 'error'); },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('history.recently');
    const d = new Date(dateString); if (isNaN(d.getTime())) return t('history.recently');
    const day = d.getDate();
    const getSuffix = (n: number) => { if (n >= 11 && n <= 13) return 'th'; switch (n % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; } };
    return `${day}${getSuffix(day)} ${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`;
  };

  const bills = Array.isArray(billsData?.data) ? billsData.data : [];

  return (
    <div className="flex flex-col flex-1 bg-background relative min-h-[calc(100vh-64px)]">
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-info/10 to-transparent -z-10" />
      <div className="pt-8 px-6 pb-20 relative z-10 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-surface rounded-full flex items-center justify-center shadow-premium-sm text-textPrimary hover:bg-surfaceMuted transition-colors"><ArrowLeft size={20} /></button>
          <h1 className="font-semibold text-xl text-textPrimary">{t('profile.myUploads')}</h1>
          <div className="w-11 h-11" />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20"><Loader2 size={32} className="text-primary animate-spin mb-4" /><p className="font-medium text-textMuted">Loading your history...</p></div>
        ) : bills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
            {bills.map((item: any) => (
              <div key={item._id || item.id} onClick={() => setSelectedBill(item)} className="premium-card premium-card-hover p-5 flex flex-col h-full cursor-pointer animate-fade-in-up">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-avatarBg rounded-full flex items-center justify-center"><Droplet size={18} className="text-primary" /></div>
                    <div>
                      <span className="block font-semibold text-base text-textPrimary">{item.fuelType ? (FUEL_LABELS[item.fuelType] || item.fuelType.charAt(0).toUpperCase() + item.fuelType.slice(1)) : t('history.processing', 'Processing...')}</span>
                      <span className="block font-medium text-sm text-textMuted">{item.stationName || 'Unknown Station'}</span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item._id || item.id); }} className="p-2 text-textMuted hover:text-error hover:bg-error/10 rounded-full transition-colors">
                    {deleteMutation.isPending && deleteMutation.variables === (item._id || item.id) ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                </div>
                <div className="flex justify-between items-end mt-auto">
                  <div>
                    {item.pricePerGallon ? <span className="block font-bold text-2xl text-textPrimary mb-1">${item.pricePerGallon.toFixed(3)}<span className="text-sm text-textMuted font-medium">/gal</span></span> : item.price ? <span className="block font-bold text-2xl text-textPrimary mb-1">${item.price.toFixed(2)}</span> : <span className="block font-bold text-xl text-warning mb-1">Pending</span>}
                    <div className="flex items-center gap-1.5 text-textMuted"><Calendar size={14} /><span className="font-medium text-xs">{formatDate(item.billDate || item.createdAt)}</span></div>
                  </div>
                  {item.imageUrl && <div className="w-14 h-14 bg-surfaceMuted rounded-xl overflow-hidden shadow-sm"><img src={item.imageUrl} alt="Receipt" className="w-full h-full object-cover" /></div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center premium-card p-10 mt-8">
            <div className="w-20 h-20 bg-surfaceMuted rounded-full flex items-center justify-center mb-5"><FileText size={32} className="text-textMuted/30" /></div>
            <h2 className="font-semibold text-xl text-textPrimary mb-2">{t('history.noUploads')}</h2>
            <p className="font-medium text-textMuted text-center max-w-sm mb-6">{t('history.noUploadsSub')}</p>
            <button onClick={() => navigate('/home')} className="btn-primary px-8 py-3 rounded-full text-base flex items-center gap-2"><Camera size={18} />{t('history.scanFirst')}</button>
          </div>
        )}
      </div>

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center premium-modal-backdrop sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md premium-modal flex flex-col max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-3xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 border-b border-border">
              <div><h2 className="font-semibold text-2xl text-textPrimary">{t('history.billDetails', 'Bill Details')}</h2><p className="font-medium text-sm text-textMuted mt-1">{formatDate(selectedBill?.billDate || selectedBill?.createdAt)}</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setConfirmDeleteId(selectedBill._id || selectedBill.id)} className="w-10 h-10 flex items-center justify-center text-textMuted hover:text-error hover:bg-error/10 rounded-full transition-colors"><Trash2 size={20} /></button>
                <button onClick={() => setSelectedBill(null)} className="w-10 h-10 flex items-center justify-center text-textPrimary bg-surfaceMuted hover:bg-surfaceMuted/80 rounded-full transition-colors"><X size={20} /></button>
              </div>
            </div>
            <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
              <div className={`flex items-center gap-4 bg-surfaceMuted p-4 rounded-2xl mb-6 ${selectedBill?.googlePlaceId ? 'cursor-pointer hover:bg-surfaceMuted/80 transition-colors' : ''}`} onClick={() => { if (selectedBill?.googlePlaceId) { setSelectedBill(null); navigate(`/station/${selectedBill.googlePlaceId}`); } }}>
                <div className="w-10 h-10 bg-surface shadow-sm rounded-full flex items-center justify-center shrink-0"><MapPin size={18} className="text-primary" /></div>
                <div className="flex-1"><span className="block font-semibold text-[15px] text-textPrimary">{selectedBill?.stationName || 'Unknown Station'}</span>{selectedBill?.googlePlaceId && <span className="block font-medium text-xs text-primary mt-0.5">{t('history.tapToViewStation', 'Tap to view station')} →</span>}</div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6 premium-card p-4">
                <div className="flex flex-col items-center justify-center text-center"><span className="font-medium text-[11px] text-textMuted uppercase tracking-wider mb-1">{t('history.pricePerGal', 'Price / Gal')}</span><span className="font-semibold text-[17px] text-textPrimary">{selectedBill?.pricePerGallon ? `$${selectedBill.pricePerGallon.toFixed(3)}` : '—'}</span></div>
                <div className="flex flex-col items-center justify-center text-center border-x border-border px-2"><span className="font-medium text-[11px] text-textMuted uppercase tracking-wider mb-1">{t('history.fuelType', 'Fuel Type')}</span><span className="font-semibold text-[15px] text-textPrimary">{selectedBill?.fuelType ? (FUEL_LABELS[selectedBill.fuelType] || selectedBill.fuelType.charAt(0).toUpperCase() + selectedBill.fuelType.slice(1)) : '—'}</span></div>
                <div className="flex flex-col items-center justify-center text-center"><span className="font-medium text-[11px] text-textMuted uppercase tracking-wider mb-1">{t('history.gallons', 'Gallons')}</span><span className="font-semibold text-[17px] text-textPrimary">{selectedBill?.totalGallons ? selectedBill.totalGallons.toFixed(2) : '—'}</span></div>
              </div>
              <div className="flex items-center justify-between p-5 bg-surfaceMuted rounded-3xl mb-8">
                <span className="font-medium text-[15px] text-textSecondary">{t('history.totalAmount', 'Total Amount')}</span>
                <span className="font-bold text-2xl text-primary">{selectedBill?.totalAmount ? `$${selectedBill.totalAmount.toFixed(2)}` : '—'}</span>
              </div>
              {selectedBill?.imageUrl && (
                <button onClick={() => setSelectedImage(selectedBill.imageUrl)} className="w-full flex items-center justify-center gap-2 bg-avatarBg hover:bg-primary/15 text-primary font-semibold text-[15px] py-4 rounded-2xl transition-colors"><ImageIcon size={20} />{t('history.viewReceiptImage', 'View Full Receipt')}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 sm:p-8 animate-in fade-in duration-200">
          <button onClick={() => setSelectedImage(null)} className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-md z-10"><X size={24} /></button>
          <img src={selectedImage} alt="Receipt Full" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center premium-modal-backdrop p-4 animate-in fade-in duration-150" onClick={() => setConfirmDeleteId(null)}>
          <div className="premium-modal w-full max-w-sm p-6 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4"><Trash2 size={26} className="text-error" /></div>
            <h3 className="font-bold text-xl text-textPrimary text-center mb-2">{t('history.deleteConfirmTitle', 'Delete this upload?')}</h3>
            <p className="font-normal text-sm text-textMuted text-center mb-6 leading-relaxed">{t('history.deleteConfirm', 'This will permanently remove this bill and its reported price. This cannot be undone.')}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3.5 rounded-2xl font-semibold text-[15px] text-textSecondary bg-surfaceMuted hover:bg-surfaceMuted/80 transition-colors">{t('common.cancel', 'Cancel')}</button>
              <button disabled={deleteMutation.isPending} onClick={() => { deleteMutation.mutate(confirmDeleteId); setConfirmDeleteId(null); }} className="flex-1 py-3.5 rounded-2xl font-semibold text-[15px] text-white bg-error hover:bg-error/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {deleteMutation.isPending && <Loader2 size={18} className="animate-spin" />}{t('history.deleteConfirmBtn', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
