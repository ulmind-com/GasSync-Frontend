import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Compass, MapPin, Heart, User, Bell } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

const Navbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const tabs = [
    { name: t('navbar.home') || 'Home', path: '/home', icon: Compass },
    { name: t('navbar.map') || 'Map', path: '/map', icon: MapPin },
    { name: t('navbar.favorites') || 'Favorites', path: '/favorites', icon: Heart },
  ];

  if (['/login', '/register', '/auth/forgot-password'].includes(location.pathname) || location.pathname === '/') {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed top-4 inset-x-0 mx-auto max-w-[90%] sm:max-w-3xl z-50 bg-white/80 backdrop-blur-md border border-gray-200/50 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] rounded-full px-4 sm:px-6"
      >
        <div className="flex justify-between h-14 items-center">
          {/* Logo & Brand */}
          <div 
            className="flex items-center cursor-pointer gap-2 shrink-0" 
            onClick={() => navigate('/home')}
          >
            <img src="/gassync_logo.png" alt="GasSync" className="w-9 h-9 rounded-xl object-contain" />
            <span className="font-bold text-lg text-gray-900 tracking-tight hidden md:block">GasSync</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center justify-center space-x-1 sm:space-x-2 md:space-x-4 flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname.startsWith(tab.path);
              
              return (
                <NavLink
                  key={tab.name}
                  to={tab.path}
                  className={`flex items-center px-3 py-1.5 rounded-full transition-all duration-200 group ${
                    isActive ? 'bg-[#34C759] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                  <span className={`ml-1.5 font-medium text-[14px] hidden sm:block ${isActive ? 'text-white' : 'text-gray-600'}`}>
                    {tab.name}
                  </span>
                </NavLink>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <button 
              onClick={() => navigate('/notifications')}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors relative"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF3B30] rounded-full border-2 border-white"></span>
            </button>
            
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-[#E8F8EC] flex items-center justify-center overflow-hidden border border-[#34C759]/20 shadow-sm hover:shadow-md transition-shadow">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={16} className="text-[#34C759]" />
                )}
              </div>
            </button>
          </div>
        </div>
      </motion.nav>
    </AnimatePresence>
  );
};

export default Navbar;
