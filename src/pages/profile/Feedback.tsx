import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Loader2, Star } from 'lucide-react';
import { api } from '../../lib/axios';

export default function Feedback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      alert(t('feedback.errorEmpty'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/feedback', {
        rating,
        message,
        platform: 'web'
      });
      alert(t('feedback.success'));
      navigate(-1);
    } catch (error: any) {
      alert(error.response?.data?.message || t('common.errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-[#F8FAFC] relative overflow-hidden min-h-[calc(100vh-64px)]">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-[#208AEF]/20 to-transparent -z-10" />

      <div className="pt-8 px-6 pb-20 relative z-10 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-gray-800 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-xl text-gray-900">{t('profile.feedback')}</h1>
          <div className="w-11 h-11" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col w-full">
          <div className="bg-white p-8 rounded-3xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-[#E8F8EC] rounded-full flex items-center justify-center mb-6">
              <MessageSquare size={32} className="text-[#34C759]" />
            </div>
            <h2 className="font-semibold text-2xl text-gray-900 mb-2">{t('feedback.howWasExperience')}</h2>
            <p className="font-medium text-[15px] text-gray-500 mb-8 text-center">{t('feedback.subtitle')}</p>

            {/* Star Rating */}
            <div className="flex items-center gap-3 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star 
                    size={36} 
                    className={`${rating >= star ? 'text-[#FFD60A] fill-[#FFD60A]' : 'text-gray-200 fill-gray-200'} transition-colors`} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
            <label className="block font-medium text-sm text-gray-700 mb-3 ml-1">{t('feedback.tellUsMore')}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('feedback.placeholder')}
              className="w-full h-40 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#34C759] focus:ring-1 focus:ring-[#34C759] transition-all font-medium text-gray-900 resize-none"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 mt-8 bg-[#34C759] hover:bg-[#2EB350] text-white rounded-full font-semibold text-lg flex items-center justify-center shadow-lg shadow-[#34C759]/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              t('feedback.submit')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
