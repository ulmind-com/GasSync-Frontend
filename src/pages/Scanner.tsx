import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Image as ImageIcon, Zap, RefreshCcw, Check, CheckCircle, MapPin, Send, RotateCcw, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
import { useToast } from '../components/Toast';

const FUEL_TYPES = [
  { key: 'regular', label: 'Regular 87' }, { key: 'midgrade', label: 'Plus 89' },
  { key: 'premium', label: 'Premium 93' }, { key: 'diesel', label: 'Diesel' },
  { key: 'e85', label: 'E85 Flex' }, { key: 'unl88', label: 'UNL 88' },
];

type ExtractedBill = {
  pricePerGallon?: number | null; totalAmount?: number | null;
  totalGallons?: number | null; fuelType?: string | null;
  stationName?: string | null; paymentMethod?: string | null; _id?: string;
};

const Scanner = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedBill | null>(null);
  const [pricePerGallon, setPricePerGallon] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [totalGallons, setTotalGallons] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('regular');

  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const stationName = searchParams.get('stationName');
  const googlePlaceId = searchParams.get('googlePlaceId');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) {
      const returnTo = googlePlaceId ? `/scanner?googlePlaceId=${googlePlaceId}&stationName=${encodeURIComponent(stationName || '')}` : '/scanner';
      const proceed = window.confirm('You need to sign in to upload bills and report prices. Go to login?');
      if (proceed) navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
      else navigate(-1);
    }
  }, [token, navigate, googlePlaceId, stationName]);

  const scanMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('billImage', file);
      if (googlePlaceId) formData.append('googlePlaceId', googlePlaceId);
      if (stationName) formData.append('stationName', stationName);
      const { lat, lon } = useLocationStore.getState();
      if (lat != null && lon != null) { formData.append('lat', String(lat)); formData.append('lng', String(lon)); }
      const res = await api.post('/bills', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data;
    },
    onSuccess: (response) => {
      const bill = response?.data;
      if (bill) {
        setExtractedData(bill);
        if (bill.pricePerGallon) setPricePerGallon(bill.pricePerGallon.toString());
        if (bill.totalAmount) setTotalAmount(bill.totalAmount.toString());
        if (bill.totalGallons) setTotalGallons(bill.totalGallons.toString());
        if (bill.fuelType) setSelectedFuel(bill.fuelType);
      }
    },
    onError: (error: any) => { showToast(error.response?.data?.message || 'Failed to process receipt.', 'error'); },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!extractedData?._id) throw new Error('No bill to update');
      const res = await api.put(`/bills/${extractedData._id}`, {
        pricePerGallon: parseFloat(pricePerGallon) || undefined,
        totalAmount: parseFloat(totalAmount) || undefined,
        totalGallons: parseFloat(totalGallons) || undefined,
        fuelType: selectedFuel, billDate: new Date().toISOString(),
      });
      return res.data;
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['my-bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill-stats'] });
      // Refresh everywhere community prices appear (station detail + home).
      queryClient.invalidateQueries({ queryKey: ['station-prices'] });
      queryClient.invalidateQueries({ queryKey: ['home-community-nearby'] });
      queryClient.invalidateQueries({ queryKey: ['home-station-prices'] });
      showToast('🎉 Price reported! Your bill is now live in the Community tab.', 'success');
      setTimeout(() => { if (googlePlaceId) navigate(`/station/${googlePlaceId}`); else navigate('/home'); }, 900);
    },
    onError: (error: any) => { showToast(error.response?.data?.message || 'Could not save price data.', 'error'); },
  });

  const resetForm = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null); setImageFile(null); setExtractedData(null);
    setPricePerGallon(''); setTotalAmount(''); setTotalGallons(''); setSelectedFuel('regular');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { if (imagePreview) URL.revokeObjectURL(imagePreview); setImageFile(file); setImagePreview(URL.createObjectURL(file)); setExtractedData(null); }
  };

  const handleScan = () => { if (!token) { navigate('/login'); return; } if (!imageFile) { showToast('Take a photo or select an image first.', 'warning'); return; } scanMutation.mutate(imageFile); };
  const handleConfirm = () => { if (!pricePerGallon || parseFloat(pricePerGallon) <= 0) { showToast('Please enter or verify the price per gallon.', 'warning'); return; } confirmMutation.mutate(); };

  const isScanning = scanMutation.isPending;
  const isSaving = confirmMutation.isPending;

  if (!token) return <div className="flex-1 flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="w-full max-w-xl mx-auto pb-32">
      <div className="px-4">
        <h1 className="text-2xl font-bold text-textPrimary mb-2">{t('scanner.title') || 'Scanner'}</h1>
        <p className="text-sm text-textMuted mb-6">{t('scanner.instruction') || 'Scan your receipt.'}</p>

        {stationName && (
          <div className="flex items-center gap-3 premium-card p-4 mb-5 border-primary/20">
            <div className="w-9 h-9 rounded-full bg-avatarBg flex items-center justify-center shrink-0"><MapPin size={16} className="text-primary" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-textMuted">Reporting price for</p>
              <p className="text-sm font-semibold text-textPrimary truncate">{stationName}</p>
            </div>
            <CheckCircle size={18} className="text-primary" />
          </div>
        )}

        {!imagePreview ? (
          <div className="flex gap-4 mb-8">
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleFileChange} />
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            <button onClick={() => cameraInputRef.current?.click()} className="flex-1 premium-card premium-card-hover p-6 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-avatarBg flex items-center justify-center mb-3"><Camera size={24} className="text-primary" /></div>
              <span className="font-semibold text-sm text-textPrimary text-center">{t('scanner.takePhoto') || 'Take Photo'}</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 premium-card premium-card-hover p-6 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-avatarBg flex items-center justify-center mb-3"><ImageIcon size={24} className="text-primary" /></div>
              <span className="font-semibold text-sm text-textPrimary text-center">{t('scanner.uploadFile') || 'Upload File'}</span>
            </button>
          </div>
        ) : !extractedData ? (
          <>
            <div className="premium-card p-4 mb-5 flex flex-col items-center">
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain rounded-xl mb-3 bg-surfaceMuted" />
              <button onClick={resetForm} className="flex items-center gap-1.5 py-2 px-4 text-textMuted hover:bg-surfaceMuted rounded-lg transition-colors">
                <RefreshCcw size={14} /><span className="text-[13px] font-medium">Change Image</span>
              </button>
            </div>
            <button onClick={handleScan} disabled={isScanning} className={`btn-primary w-full rounded-2xl overflow-hidden mb-6 py-[18px] ${isScanning ? 'opacity-60 cursor-not-allowed' : 'active:scale-[0.98]'}`}>
              {isScanning ? (
                <div className="flex flex-col items-center gap-2"><Loader2 className="w-5 h-5 text-white animate-spin" /><span className="font-bold text-white text-base">AI is reading your receipt...</span></div>
              ) : ( <><Zap size={20} className="text-white fill-white" /><span className="font-bold text-white text-base">Scan with AI</span></> )}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 bg-avatarBg rounded-2xl p-4 mb-5 border border-primary/20">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0"><Check size={18} className="text-white" /></div>
              <div><h3 className="font-bold text-[15px] text-textPrimary">AI Extraction Complete!</h3><p className="text-xs text-textMuted mt-0.5">Review and correct if needed, then hit submit.</p></div>
            </div>

            <div className="premium-card p-5 mb-5">
              <h2 className="font-bold text-[17px] text-textPrimary mb-2">Extracted Details</h2>

              <label className="block font-medium text-[13px] text-textMuted mb-2 mt-3.5">Fuel Type</label>
              <div className="flex flex-wrap gap-2">
                {FUEL_TYPES.map(ft => (
                  <button key={ft.key} onClick={() => setSelectedFuel(ft.key)}
                    className={`px-4 py-2.5 rounded-xl border-[1.5px] text-[13px] transition-colors ${selectedFuel === ft.key ? 'bg-avatarBg border-primary text-primary font-semibold' : 'bg-surfaceMuted border-transparent text-textMuted font-medium hover:bg-surfaceMuted'}`}
                  >{ft.label}</button>
                ))}
              </div>

              <label className="block font-medium text-[13px] text-textMuted mb-2 mt-4">Price per Gallon *</label>
              <div className="premium-input flex items-center px-4 py-1">
                <span className="text-2xl text-textPrimary tracking-tighter mr-1">$</span>
                <input type="number" inputMode="decimal" step="0.001" placeholder="0.000" value={pricePerGallon} onChange={(e) => setPricePerGallon(e.target.value)} className="flex-1 bg-transparent py-3 text-[22px] font-semibold text-textPrimary focus:outline-none placeholder:text-textMuted" />
                <span className="font-medium text-sm text-textMuted ml-1">/gal</span>
              </div>

              <label className="block font-medium text-[13px] text-textMuted mb-2 mt-4">Gallons (optional)</label>
              <div className="premium-input flex items-center px-4 py-1">
                <input type="number" inputMode="decimal" step="0.001" placeholder="0.000" value={totalGallons} onChange={(e) => setTotalGallons(e.target.value)} className="flex-1 bg-transparent py-3 text-[22px] font-semibold text-textPrimary focus:outline-none placeholder:text-textMuted" />
                <span className="font-medium text-sm text-textMuted ml-1">gal</span>
              </div>

              <label className="block font-medium text-[13px] text-textMuted mb-2 mt-4">Total Amount (optional)</label>
              <div className="premium-input flex items-center px-4 py-1">
                <span className="text-2xl text-textPrimary tracking-tighter mr-1">$</span>
                <input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="flex-1 bg-transparent py-3 text-[22px] font-semibold text-textPrimary focus:outline-none placeholder:text-textMuted" />
              </div>
            </div>

            <div className="flex gap-3 mb-8">
              <button onClick={resetForm} className="flex items-center justify-center gap-1.5 py-4 px-5 rounded-2xl bg-warning/10 border-[1.5px] border-warning/20 text-warning hover:bg-warning/15 transition-colors">
                <RotateCcw size={16} /><span className="font-semibold text-sm">Rescan</span>
              </button>
              <button onClick={handleConfirm} disabled={isSaving} className={`btn-primary flex-1 rounded-2xl py-4 ${isSaving ? 'opacity-60 cursor-not-allowed' : 'active:scale-[0.98]'}`}>
                {isSaving ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <><Send size={18} /><span className="font-bold text-[15px]">Submit Price</span></>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Scanner;
