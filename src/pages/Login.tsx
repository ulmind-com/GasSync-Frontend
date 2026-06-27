import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/axios';
import { useGoogleLogin } from '@react-oauth/google';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo');

  const handleGoogleLogin = useGoogleLogin({
    scope: 'openid email profile',
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        const res = await api.post('/auth/google', { accessToken: tokenResponse.access_token });
        const { accessToken, user } = res.data.data;
        await login(accessToken, user);
        if (returnTo) {
          navigate(returnTo, { replace: true });
        } else {
          navigate('/home', { replace: true });
        }
      } catch (error: any) {
        setError(error.response?.data?.message || 'Google authentication failed');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google authentication failed');
    }
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('auth.fillFields'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, user } = res.data.data;
      await login(accessToken, user);
      if (returnTo) {
        navigate(returnTo, { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-b from-[#208AEF]/20 via-[#F8FAFC] to-[#F8FAFC] -z-10" />

      <div className="flex flex-col flex-1 px-6 justify-center max-w-md mx-auto w-full py-12">
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 rounded-[40px] bg-white shadow-[0_10px_20px_rgba(52,199,89,0.2)] mb-6 overflow-hidden flex items-center justify-center">
            <img src="/gassync_logo.png" alt="GasSync Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-bold text-3xl text-gray-900 mb-2">{t('auth.signInTitle')}</h1>
          <p className="font-normal text-base text-gray-500">{t('auth.signInSubtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="w-full flex flex-col">
          {error && (
            <div className="bg-red-50 text-[#FF3B30] text-sm font-medium px-4 py-3 rounded-2xl mb-4 text-center border border-red-100">
              {error}
            </div>
          )}
          
          <div className="flex items-center bg-white h-[60px] rounded-[30px] mb-4 px-5 border border-gray-100 shadow-[0_4px_8px_rgba(0,0,0,0.03)] focus-within:border-[#34C759] focus-within:shadow-[0_4px_12px_rgba(52,199,89,0.1)] transition-all">
            <Mail size={20} className="text-gray-400 mr-3" />
            <input
              type="email"
              className="flex-1 bg-transparent outline-none font-medium text-base text-gray-900 placeholder:text-gray-400"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center bg-white h-[60px] rounded-[30px] mb-4 px-5 border border-gray-100 shadow-[0_4px_8px_rgba(0,0,0,0.03)] focus-within:border-[#34C759] focus-within:shadow-[0_4px_12px_rgba(52,199,89,0.1)] transition-all">
            <Lock size={20} className="text-gray-400 mr-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="flex-1 bg-transparent outline-none font-medium text-base text-gray-900 placeholder:text-gray-400"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none">
              {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>

          <button type="button" onClick={() => navigate('/auth/forgot-password')} className="self-end mb-6 text-sm font-medium text-[#34C759] hover:text-[#2EB350]">
            {t('auth.forgotPassword')}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[60px] rounded-[30px] bg-gradient-to-r from-[#34C759] to-[#2EAE4E] shadow-[0_8px_16px_rgba(52,199,89,0.3)] flex items-center justify-center font-semibold text-lg text-white hover:opacity-95 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              t('auth.signInButton')
            )}
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="mx-4 font-medium text-sm text-gray-500">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={() => handleGoogleLogin()}
            disabled={loading}
            className="flex items-center justify-center h-[60px] rounded-[30px] bg-white border border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed font-semibold text-base text-gray-900"
          >
            <img src="/google_logo.svg" alt="Google" className="w-6 h-6 mr-3" />
            Continue with Google
          </button>
        </form>

        <div className="flex justify-center mt-8">
          <span className="font-normal text-[15px] text-gray-500">{t('auth.noAccount')} </span>
          <button onClick={() => navigate(returnTo ? `/register?returnTo=${returnTo}` : '/register')} className="font-semibold text-[15px] text-[#34C759] ml-1 hover:underline">
            {t('auth.signUpLink')}
          </button>
        </div>
      </div>
    </div>
  );
}
