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
          navigate('/', { replace: true });
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
        navigate('/', { replace: true });
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-full app-ambient -z-10" />

      <div className="flex flex-col flex-1 px-5 sm:px-6 justify-center max-w-md mx-auto w-full py-8 sm:py-12">
        <div className="flex flex-col items-center mb-8 sm:mb-12">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[32px] sm:rounded-[40px] liquid-glass shadow-premium-lg mb-4 sm:mb-6 overflow-hidden flex items-center justify-center">
            <img src="/gassync_logo.png" alt="GasSync Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-bold text-2xl sm:text-3xl text-textPrimary mb-1.5 sm:mb-2">{t('auth.signInTitle')}</h1>
          <p className="font-normal text-[14px] sm:text-base text-textSecondary">{t('auth.signInSubtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="w-full flex flex-col">
          {error && (
            <div className="bg-error/10 text-error text-sm font-medium px-4 py-3 rounded-2xl mb-4 text-center border border-error/20">
              {error}
            </div>
          )}
          
          <div className="premium-input flex items-center h-[52px] sm:h-[60px] mb-3 sm:mb-4 px-4 sm:px-5">
            <Mail size={20} className="text-textMuted mr-3" />
            <input
              type="email"
              className="flex-1 bg-transparent outline-none font-medium text-base text-textPrimary placeholder:text-textMuted"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="premium-input flex items-center h-[52px] sm:h-[60px] mb-3 sm:mb-4 px-4 sm:px-5">
            <Lock size={20} className="text-textMuted mr-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="flex-1 bg-transparent outline-none font-medium text-base text-textPrimary placeholder:text-textMuted"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 text-textMuted hover:text-textSecondary focus:outline-none transition-colors">
              {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>

          <button type="button" onClick={() => navigate('/auth/forgot-password')} className="self-end mb-4 sm:mb-6 text-sm font-medium text-primary hover:text-primary-strong transition-colors">
            {t('auth.forgotPassword')}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full h-[52px] sm:h-[60px] rounded-[26px] sm:rounded-[30px] text-base sm:text-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              t('auth.signInButton')
            )}
          </button>

          <div className="flex items-center my-4 sm:my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="mx-4 font-medium text-sm text-textMuted">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            type="button"
            onClick={() => handleGoogleLogin()}
            disabled={loading}
            className="premium-input flex items-center justify-center h-[60px] hover:bg-surfaceMuted transition-colors disabled:opacity-70 disabled:cursor-not-allowed font-semibold text-base text-textPrimary"
          >
            <img src="/google_logo.svg" alt="Google" className="w-6 h-6 mr-3" />
            Continue with Google
          </button>
        </form>

        <div className="flex justify-center mt-8">
          <span className="font-normal text-[15px] text-textSecondary">{t('auth.noAccount')} </span>
          <button onClick={() => navigate(returnTo ? `/register?returnTo=${returnTo}` : '/register')} className="font-semibold text-[15px] text-primary ml-1 hover:underline">
            {t('auth.signUpLink')}
          </button>
        </div>
      </div>
    </div>
  );
}
