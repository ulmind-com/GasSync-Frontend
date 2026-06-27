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
  { key: 'regular', label: 'Regular 87' },
  { key: 'midgrade', label: 'Plus 89' },
  { key: 'premium', label: 'Premium 93' },
  { key: 'diesel', label: 'Diesel' },
  { key: 'e85', label: 'E85 Flex' },
  { key: 'unl88', label: 'UNL 88' },
];

type ExtractedBill = {
  pricePerGallon?: number | null;
  totalAmount?: number | null;
  totalGallons?: number | null;
  fuelType?: string | null;
  stationName?: string | null;
  paymentMethod?: string | null;
  _id?: string;
};

const Scanner = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedBill | null>(null);

  // Editable fields
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

  // Auth guard
  useEffect(() => {
    if (!token) {
      const returnTo = googlePlaceId
        ? `/scanner?googlePlaceId=${googlePlaceId}&stationName=${encodeURIComponent(stationName || '')}`
        : '/scanner';
      
      const proceed = window.confirm('You need to sign in to upload bills and report prices. Go to login?');
      if (proceed) {
        navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
      } else {
        navigate(-1);
      }
    }
  }, [token, navigate, googlePlaceId, stationName]);

  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['my-bills'],
    queryFn: async () => {
      const res = await api.get('/bills');
      return res.data;
    },
    enabled: !!token,
  });

  const scanMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('billImage', file);

      if (googlePlaceId) formData.append('googlePlaceId', googlePlaceId);
      if (stationName) formData.append('stationName', stationName);

      // Geo-tag the bill with the user's location (for the nearby community feed)
      const { lat, lon } = useLocationStore.getState();
      if (lat != null && lon != null) {
        formData.append('lat', String(lat));
        formData.append('lng', String(lon));
      }

      const res = await api.post('/bills', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to process receipt.', 'error');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!extractedData?._id) throw new Error('No bill to update');
      
      const res = await api.put(`/bills/${extractedData._id}`, {
        pricePerGallon: parseFloat(pricePerGallon) || undefined,
        totalAmount: parseFloat(totalAmount) || undefined,
        totalGallons: parseFloat(totalGallons) || undefined,
        fuelType: selectedFuel,
        billDate: new Date().toISOString(),
      });
      return res.data;
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['my-bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill-stats'] });
      if (googlePlaceId) {
        queryClient.invalidateQueries({ queryKey: ['station-prices', googlePlaceId] });
      }
      
      showToast('🎉 Price reported! Your bill is now live in the Community tab.', 'success');
      setTimeout(() => {
        if (googlePlaceId) {
          navigate(`/station/${googlePlaceId}`);
        } else {
          navigate('/home');
        }
      }, 900);
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Could not save price data.', 'error');
    },
  });

  const resetForm = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
    setExtractedData(null);
    setPricePerGallon('');
    setTotalAmount('');
    setTotalGallons('');
    setSelectedFuel('regular');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setExtractedData(null);
    }
  };

  const handleScan = () => {
    if (!token) { navigate('/login'); return; }
    if (!imageFile) { showToast('Take a photo or select an image first.', 'warning'); return; }
    scanMutation.mutate(imageFile);
  };

  const handleConfirm = () => {
    if (!pricePerGallon || parseFloat(pricePerGallon) <= 0) {
      showToast('Please enter or verify the price per gallon.', 'warning');
      return;
    }
    confirmMutation.mutate();
  };

  const isScanning = scanMutation.isPending;
  const isSaving = confirmMutation.isPending;

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#34C759] animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto pb-32">
      <div className="px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('scanner.title') || 'Scanner'}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('scanner.instruction') || 'Scan your receipt.'}</p>

        {/* Station Context Banner */}
        {stationName && (
          <div className="flex items-center gap-3 bg-white rounded-2xl p-4 mb-5 border border-[#34C759]/20 shadow-[0_2px_8px_rgba(52,199,89,0.08)]">
            <div className="w-9 h-9 rounded-full bg-[#E8F8EC] flex items-center justify-center shrink-0">
              <MapPin size={16} className="text-[#34C759]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-500">Reporting price for</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{stationName}</p>
            </div>
            <CheckCircle size={18} className="text-[#34C759]" />
          </div>
        )}

        {/* ── STEP 1: Take / Pick Photo ── */}
        {!imagePreview ? (
          <div className="flex gap-4 mb-8">
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              ref={cameraInputRef} 
              onChange={handleFileChange} 
            />
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            
            <button 
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 bg-white rounded-[20px] p-6 flex flex-col items-center justify-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-full bg-[#E8F8EC] flex items-center justify-center mb-3">
                <Camera size={24} className="text-[#34C759]" />
              </div>
              <span className="font-semibold text-sm text-gray-900 text-center">{t('scanner.takePhoto') || 'Take Photo'}</span>
            </button>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-white rounded-[20px] p-6 flex flex-col items-center justify-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-full bg-[#E8F8EC] flex items-center justify-center mb-3">
                <ImageIcon size={24} className="text-[#34C759]" />
              </div>
              <span className="font-semibold text-sm text-gray-900 text-center">{t('scanner.uploadFile') || 'Upload File'}</span>
            </button>
          </div>
        ) : !extractedData ? (
          /* ── STEP 2: Photo taken, ready to scan ── */
          <>
            <div className="bg-white rounded-[20px] p-4 mb-5 border border-gray-100 shadow-sm flex flex-col items-center">
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain rounded-xl mb-3 bg-gray-50" />
              <button 
                onClick={resetForm}
                className="flex items-center gap-1.5 py-2 px-4 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <RefreshCcw size={14} />
                <span className="text-[13px] font-medium">Change Image</span>
              </button>
            </div>

            <button
              onClick={handleScan}
              disabled={isScanning}
              className={`w-full rounded-2xl overflow-hidden mb-6 transition-opacity ${isScanning ? 'opacity-60 cursor-not-allowed' : 'active:scale-[0.98]'}`}
            >
              <div className="bg-gradient-to-br from-[#34C759] to-[#2EAE4E] flex items-center justify-center gap-2.5 py-[18px]">
                {isScanning ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                    <span className="font-bold text-white text-base">AI is reading your receipt...</span>
                  </div>
                ) : (
                  <>
                    <Zap size={20} className="text-white fill-white" />
                    <span className="font-bold text-white text-base">Scan with AI</span>
                  </>
                )}
              </div>
            </button>
          </>
        ) : (
          /* ── STEP 3: OCR complete, show extracted data for review ── */
          <>
            <div className="flex items-center gap-3 bg-[#E8F8EC] rounded-2xl p-4 mb-5 border border-[#34C759]/20">
              <div className="w-8 h-8 rounded-full bg-[#34C759] flex items-center justify-center shrink-0">
                <Check size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-gray-900">AI Extraction Complete!</h3>
                <p className="text-xs text-gray-500 mt-0.5">Review and correct if needed, then hit submit.</p>
              </div>
            </div>

            <div className="bg-white rounded-[20px] p-5 mb-5 border border-gray-100 shadow-sm">
              <h2 className="font-bold text-[17px] text-gray-900 mb-2">Extracted Details</h2>

              <label className="block font-medium text-[13px] text-gray-500 mb-2 mt-3.5">Fuel Type</label>
              <div className="flex flex-wrap gap-2">
                {FUEL_TYPES.map(ft => (
                  <button
                    key={ft.key}
                    onClick={() => setSelectedFuel(ft.key)}
                    className={`px-4 py-2.5 rounded-xl border-[1.5px] text-[13px] transition-colors ${
                      selectedFuel === ft.key 
                        ? 'bg-[#E8F8EC] border-[#34C759] text-[#34C759] font-semibold' 
                        : 'bg-gray-50 border-transparent text-gray-500 font-medium hover:bg-gray-100'
                    }`}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>

              <label className="block font-medium text-[13px] text-gray-500 mb-2 mt-4">Price per Gallon *</label>
              <div className="flex items-center bg-gray-50 rounded-xl px-4 py-1 border border-gray-100 focus-within:border-[#34C759] focus-within:bg-white transition-colors">
                <span className="text-2xl text-gray-900 tracking-tighter mr-1">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  placeholder="0.000"
                  value={pricePerGallon}
                  onChange={(e) => setPricePerGallon(e.target.value)}
                  className="flex-1 bg-transparent py-3 text-[22px] font-semibold text-gray-900 focus:outline-none placeholder:text-gray-400"
                />
                <span className="font-medium text-sm text-gray-500 ml-1">/gal</span>
              </div>

              <label className="block font-medium text-[13px] text-gray-500 mb-2 mt-4">Gallons (optional)</label>
              <div className="flex items-center bg-gray-50 rounded-xl px-4 py-1 border border-gray-100 focus-within:border-[#34C759] focus-within:bg-white transition-colors">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  placeholder="0.000"
                  value={totalGallons}
                  onChange={(e) => setTotalGallons(e.target.value)}
                  className="flex-1 bg-transparent py-3 text-[22px] font-semibold text-gray-900 focus:outline-none placeholder:text-gray-400"
                />
                <span className="font-medium text-sm text-gray-500 ml-1">gal</span>
              </div>

              <label className="block font-medium text-[13px] text-gray-500 mb-2 mt-4">Total Amount (optional)</label>
              <div className="flex items-center bg-gray-50 rounded-xl px-4 py-1 border border-gray-100 focus-within:border-[#34C759] focus-within:bg-white transition-colors">
                <span className="text-2xl text-gray-900 tracking-tighter mr-1">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="flex-1 bg-transparent py-3 text-[22px] font-semibold text-gray-900 focus:outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="flex gap-3 mb-8">
              <button
                onClick={resetForm}
                className="flex items-center justify-center gap-1.5 py-4 px-5 rounded-2xl bg-[#FFF8F0] border-[1.5px] border-[#FF9500]/20 text-[#FF9500] hover:bg-[#FFF0E0] transition-colors"
              >
                <RotateCcw size={16} />
                <span className="font-semibold text-sm">Rescan</span>
              </button>
              
              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className={`flex-1 rounded-2xl overflow-hidden transition-opacity ${isSaving ? 'opacity-60 cursor-not-allowed' : 'active:scale-[0.98]'}`}
              >
                <div className="bg-gradient-to-br from-[#34C759] to-[#2EAE4E] flex items-center justify-center gap-2 py-4 h-full">
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <>
                      <Send size={18} className="text-white" />
                      <span className="font-bold text-[15px] text-white">Submit Price</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Scanner;
