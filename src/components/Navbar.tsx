import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Compass, MapPin, Heart, User, Bell, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Magnetic } from './CursorEffects';

const Navbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const tabs = [
    { name: t('navbar.home') || 'Home', path: '/', icon: Compass },
    { name: t('navbar.map') || 'Map', path: '/map', icon: MapPin },
    { name: t('navbar.favorites') || 'Favorites', path: '/favorites', icon: Heart },
  ];

  if (['/login', '/register', '/auth/forgot-password'].includes(location.pathname)) {
    return null;
  }

  // ─── Mobile Bottom Tab Bar ───
  if (isMobile) {
    const mobileTabs = [
      ...tabs,
      { name: t('navbar.profile') || 'Profile', path: '/profile', icon: User },
    ];

    return (
      <nav className="mobile-tab-bar" style={{
        boxShadow: isDark
          ? '0 -1px 20px -4px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)'
          : '0 -1px 20px -4px rgba(0,0,0,0.06), 0 0 0 1px rgba(25,28,33,0.04)',
      }}>
        <div className="flex items-center justify-around px-2">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.path === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.path);
            
            return (
              <NavLink
                key={tab.name}
                to={tab.path}
                className={`mobile-tab-item ${isActive ? 'active' : 'text-textMuted'}`}
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  {tab.path === '/profile' && user?.avatarUrl ? (
                    <div className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-colors ${isActive ? 'border-primary' : 'border-transparent'}`}>
                      <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  )}
                </motion.div>
                <span className={`mobile-tab-label ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {tab.name}
                </span>
              </NavLink>
            );
          })}
          
          {/* Notification bell in mobile tab bar */}
          <button
            onClick={() => navigate('/notifications')}
            className={`mobile-tab-item ${location.pathname === '/notifications' ? 'active' : 'text-textMuted'}`}
          >
            <motion.div
              whileTap={{ scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="relative"
            >
              <Bell size={22} strokeWidth={location.pathname === '/notifications' ? 2.5 : 2} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-error rounded-full border border-surface"></span>
            </motion.div>
            <span className={`mobile-tab-label ${location.pathname === '/notifications' ? 'font-bold' : 'font-medium'}`}>
              Alerts
            </span>
          </button>
        </div>
      </nav>
    );
  }

  // ─── Desktop Top Floating Navbar ───
  return (
    <AnimatePresence mode="wait">
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed top-4 inset-x-0 mx-auto max-w-[90%] sm:max-w-3xl z-50 glass rounded-full px-4 sm:px-6"
        style={{
          boxShadow: isDark
            ? '0 2px 24px -4px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)'
            : '0 2px 24px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(25,28,33,0.06)',
        }}
      >
        <div className="flex justify-between h-14 items-center">
          {/* Logo & Brand */}
          <div 
            className="flex items-center cursor-pointer gap-2 shrink-0" 
            onClick={() => navigate('/')}
          >
            <Magnetic strength={0.25}>
            <img src="/gassync_logo.png" alt="GasSync" className="w-9 h-9 rounded-xl object-contain" />
            </Magnetic>
            <span className="font-heading font-bold text-lg text-textPrimary tracking-tight hidden md:block">GasSync</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center justify-center space-x-1 sm:space-x-2 md:space-x-4 flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.path === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.path);
              
              return (
                <NavLink
                  key={tab.name}
                  to={tab.path}
                  className={`flex items-center px-4 py-2 rounded-full transition-all duration-200 group ${
                    isActive 
                      ? 'shadow-md' 
                      : 'text-textMuted hover:bg-surfaceMuted hover:text-textPrimary'
                  }`}
                  style={isActive ? {
                    background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-primary-strong)))',
                    color: 'white',
                    boxShadow: '0 4px 14px -4px rgb(var(--color-primary) / 0.5)',
                  } : undefined}
                >
                  <Icon size={18} className={isActive ? 'text-white' : 'text-iconMuted group-hover:text-textSecondary'} style={isActive ? { color: 'white' } : undefined} />
                  <span className={`ml-1.5 font-semibold text-[14px] hidden sm:block`} style={isActive ? { color: 'white' } : undefined}>
                    {tab.name}
                  </span>
                </NavLink>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle text-textSecondary hover:text-textPrimary"
              aria-label="Toggle dark mode"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <Sun size={19} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <Moon size={19} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            <button 
              onClick={() => navigate('/notifications')}
              className="p-1.5 rounded-full text-textMuted hover:text-textPrimary hover:bg-surfaceMuted transition-colors relative"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
            </button>
            
            <Magnetic strength={0.3}>
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-avatarBg flex items-center justify-center overflow-hidden border border-primary/20 shadow-sm hover:shadow-md hover:scale-110 transition-all">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={16} className="text-primary" />
                )}
              </div>
            </button>
            </Magnetic>
          </div>
        </div>
      </motion.nav>
    </AnimatePresence>
  );
};

export default Navbar;
