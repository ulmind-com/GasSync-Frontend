import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/axios';
import { useGoogleLogin } from '@react-oauth/google';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo');

  const handleGoogleLogin = useGoogleLogin({
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

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t('auth.fillFields'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { email });
      setStep(2);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 4) {
      setError('Please enter a 4-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-otp', { email, otp: otpString });
      setStep(3);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !password) {
      setError(t('auth.fillFields'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const otpString = otp.join('');
      const res = await api.post('/auth/register', { displayName, email, password, otp: otpString });
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

  const handleOtpChange = (text: string, index: number) => {
    const val = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    if (val && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
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
          <h1 className="font-bold text-3xl text-gray-900 mb-2">{t('auth.signUpTitle')}</h1>
          <p className="font-normal text-base text-gray-500 text-center">
            {step === 1 && 'Enter your email to get started'}
            {step === 2 && `We sent a code to ${email}`}
            {step === 3 && 'Just a few more details'}
          </p>
        </div>

        <div className="w-full flex flex-col min-h-[220px]">
          {error && (
            <div className="bg-red-50 text-[#FF3B30] text-sm font-medium px-4 py-3 rounded-2xl mb-4 text-center border border-red-100">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="w-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center bg-white h-[60px] rounded-[30px] mb-6 px-5 border border-gray-100 shadow-[0_4px_8px_rgba(0,0,0,0.03)] focus-within:border-[#34C759] focus-within:shadow-[0_4px_12px_rgba(52,199,89,0.1)] transition-all">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[60px] rounded-[30px] bg-gradient-to-r from-[#34C759] to-[#2EAE4E] shadow-[0_8px_16px_rgba(52,199,89,0.3)] flex items-center justify-center font-semibold text-lg text-white hover:opacity-95 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed mb-6"
              >
                {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send OTP'}
              </button>

              <div className="flex items-center mb-6">
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
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="w-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between mb-8 px-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={otpRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    className="w-[60px] h-[60px] bg-white rounded-2xl border border-gray-200 shadow-[0_4px_8px_rgba(0,0,0,0.03)] text-center text-2xl font-semibold text-gray-900 outline-none focus:border-[#34C759] focus:shadow-[0_4px_12px_rgba(52,199,89,0.1)] transition-all"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[60px] rounded-[30px] bg-gradient-to-r from-[#34C759] to-[#2EAE4E] shadow-[0_8px_16px_rgba(52,199,89,0.3)] flex items-center justify-center font-semibold text-lg text-white hover:opacity-95 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Verify OTP'}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleRegister} className="w-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center bg-white h-[60px] rounded-[30px] mb-4 px-5 border border-gray-100 shadow-[0_4px_8px_rgba(0,0,0,0.03)] focus-within:border-[#34C759] focus-within:shadow-[0_4px_12px_rgba(52,199,89,0.1)] transition-all">
                <User size={20} className="text-gray-400 mr-3" />
                <input
                  type="text"
                  className="flex-1 bg-transparent outline-none font-medium text-base text-gray-900 placeholder:text-gray-400"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center bg-white h-[60px] rounded-[30px] mb-6 px-5 border border-gray-100 shadow-[0_4px_8px_rgba(0,0,0,0.03)] focus-within:border-[#34C759] focus-within:shadow-[0_4px_12px_rgba(52,199,89,0.1)] transition-all">
                <Lock size={20} className="text-gray-400 mr-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="flex-1 bg-transparent outline-none font-medium text-base text-gray-900 placeholder:text-gray-400"
                  placeholder="Password (Min 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none">
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[60px] rounded-[30px] bg-gradient-to-r from-[#34C759] to-[#2EAE4E] shadow-[0_8px_16px_rgba(52,199,89,0.3)] flex items-center justify-center font-semibold text-lg text-white hover:opacity-95 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('auth.signUpButton')}
              </button>
            </form>
          )}
        </div>

        <div className="flex justify-center mt-12">
          <span className="font-normal text-[15px] text-gray-500">{t('auth.hasAccount')} </span>
          <button onClick={() => navigate(returnTo ? `/login?returnTo=${returnTo}` : '/login')} className="font-semibold text-[15px] text-[#34C759] ml-1 hover:underline">
            {t('auth.signInLink')}
          </button>
        </div>
      </div>
    </div>
  );
}
