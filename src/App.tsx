import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { useAuthStore } from './store/authStore';

import Home from './pages/Home';

import MapView from './pages/Map';
import Favorites from './pages/Favorites';

import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import StationDetails from './pages/StationDetails';
import StationAll from './pages/StationAll';
import Notifications from './pages/Notifications';
import LocationSearch from './pages/LocationSearch';

import EditProfile from './pages/profile/EditProfile';
import History from './pages/profile/History';
import ChangePassword from './pages/profile/ChangePassword';
import Language from './pages/profile/Language';
import Feedback from './pages/profile/Feedback';
import HowToUse from './pages/profile/HowToUse';
import Help from './pages/profile/Help';

// Placeholder Pages
const Scanner = () => <div className="p-4 pt-12 pb-24 h-screen bg-[#F8FAFC]">Scanner Page</div>;
const ForgotPassword = () => <div className="p-4 h-screen bg-[#F8FAFC]">Forgot Password Page</div>;

function App() {
  const fetchUser = useAuthStore((state) => state.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <BrowserRouter>
      <div className="w-full h-full min-h-screen bg-[#F8FAFC] text-[#1A1A1A] font-poppins relative overflow-x-hidden flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-0 sm:px-4 lg:px-8 pb-10">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/station/:id" element={<StationDetails />} />
            <Route path="/station/all" element={<StationAll />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/location-search" element={<LocationSearch />} />
            
            {/* Profile Subpages */}
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/profile/history" element={<History />} />
            <Route path="/profile/change-password" element={<ChangePassword />} />
            <Route path="/profile/language" element={<Language />} />
            <Route path="/profile/feedback" element={<Feedback />} />
            <Route path="/profile/how-to-use" element={<HowToUse />} />
            <Route path="/profile/help" element={<Help />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
