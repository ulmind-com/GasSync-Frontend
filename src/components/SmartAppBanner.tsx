import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const SmartAppBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show on mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('gassync-banner-dismissed');
    
    if (isMobile && !isDismissed) {
      // Small delay for smoother entry
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('gassync-banner-dismissed', 'true');
    setIsVisible(false);
  };

  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.gassync.fuel&pcampaignid=web_share';
  
  // Android intent URL handles both cases:
  // If app is installed -> Opens the app directly
  // If app is NOT installed -> Falls back to Play Store link
  const intentUrl = `intent://open/#Intent;scheme=gassync;package=com.gassync.fuel;S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`;

  const handleAction = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = intentUrl;
    } else {
      window.open(playStoreUrl, '_blank');
    }
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-[100] bg-surface/95 backdrop-blur-xl border-b border-white/10 p-3 shadow-2xl flex items-center justify-between animate-in slide-in-from-top duration-500 ease-out">
      <button 
        onClick={handleDismiss}
        className="p-1 mr-2 text-textMuted hover:text-textPrimary transition-colors"
        aria-label="Close banner"
      >
        <X size={20} />
      </button>
      
      <div className="flex-1 flex items-center gap-3 cursor-pointer" onClick={handleAction}>
        <img src="/gassync_logo.png" alt="GasSync" className="w-10 h-10 rounded-xl shadow-sm border border-white/10 object-contain bg-white" />
        <div className="flex flex-col">
          <span className="text-[15px] font-bold text-textPrimary leading-tight">GasSync</span>
          <span className="text-[12px] text-textSecondary leading-tight">Continue in App or Download</span>
        </div>
      </div>
      
      <button 
        onClick={handleAction}
        className="ml-3 px-4 py-1.5 bg-primary text-white text-sm font-semibold rounded-full shadow-lg hover:shadow-xl hover:bg-primary/90 active:scale-95 transition-all"
      >
        OPEN
      </button>
    </div>
  );
};

export default SmartAppBanner;
