import React, { useState, useEffect } from 'react';
import { X, Star, Globe } from 'lucide-react';

const SmartAppBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Only show on mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('gassync-banner-dismissed');
    
    if (isMobile && !isDismissed) {
      // Show bottom sheet after a short delay
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      sessionStorage.setItem('gassync-banner-dismissed', 'true');
      setIsVisible(false);
      setIsClosing(false);
    }, 300); // Wait for exit animation
  };

  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.gassync.fuel&pcampaignid=web_share';
  
  const intentUrl = `intent://open/#Intent;scheme=gassync;package=com.gassync.fuel;S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`;

  const handleOpenApp = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = intentUrl;
    } else {
      window.open(playStoreUrl, '_blank');
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`md:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleDismiss}
      />
      
      {/* Bottom Sheet */}
      <div 
        className={`md:hidden fixed bottom-0 left-0 right-0 z-[101] bg-surface border-t border-white/10 rounded-t-[32px] p-6 pb-8 shadow-2xl flex flex-col items-center transform transition-transform duration-300 ease-out ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}
      >
        {/* Drag handle pill */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mb-6" />
        
        {/* App Info */}
        <img 
          src="/gassync_logo.png" 
          alt="GasSync" 
          className="w-20 h-20 rounded-2xl shadow-lg border border-white/10 object-contain bg-white mb-4" 
        />
        
        <h2 className="text-2xl font-bold text-textPrimary mb-1">GasSync</h2>
        
        <div className="flex items-center gap-1 text-primary mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} size={16} fill="currentColor" />
          ))}
        </div>
        
        <p className="text-sm text-textSecondary text-center mb-8 px-4">
          Experience the best of GasSync on our mobile app. Faster, smoother, and designed for you.
        </p>
        
        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <button 
            onClick={handleOpenApp}
            className="w-full py-3.5 bg-primary text-white text-base font-semibold rounded-2xl shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <img src="/gassync_logo.png" alt="App Icon" className="w-5 h-5 rounded object-contain bg-white" />
            Continue in GasSync App
          </button>
          
          <button 
            onClick={handleDismiss}
            className="w-full py-3.5 bg-surfaceMuted/50 text-textPrimary text-base font-medium rounded-2xl hover:bg-surfaceMuted active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Globe size={20} className="text-textSecondary" />
            Continue in Browser
          </button>
        </div>
      </div>
    </>
  );
};

export default SmartAppBanner;
