import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Compass, MapPin, Heart, User, Fuel, Bell } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const tabs = [
    { name: 'Home', path: '/home', icon: Compass },
    { name: 'Map', path: '/map', icon: MapPin },
    { name: 'Favorites', path: '/favorites', icon: Heart },
  ];

  // Don't show navbar on auth screens
  if (['/login', '/register', '/auth/forgot-password'].includes(location.pathname) || location.pathname === '/') {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div 
            className="flex items-center cursor-pointer gap-2" 
            onClick={() => navigate('/home')}
          >
            <div className="w-10 h-10 bg-[#34C759] rounded-xl flex items-center justify-center">
              <Fuel size={22} className="text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 tracking-tight hidden sm:block">GasSync</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2 md:space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname.startsWith(tab.path);
              
              return (
                <NavLink
                  key={tab.name}
                  to={tab.path}
                  className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 group ${
                    isActive ? 'bg-[#E8F8EC] text-[#34C759]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-[#34C759]' : 'text-gray-400 group-hover:text-gray-600'} />
                  <span className={`ml-2 font-medium text-[15px] hidden md:block ${isActive ? 'text-[#34C759]' : 'text-gray-600'}`}>
                    {tab.name}
                  </span>
                </NavLink>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/notifications')}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors relative"
            >
              <Bell size={22} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF3B30] rounded-full border-2 border-white"></span>
            </button>
            
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 pl-2 focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-[#E8F8EC] flex items-center justify-center overflow-hidden border border-[#34C759]/20">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-[#34C759]" />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
