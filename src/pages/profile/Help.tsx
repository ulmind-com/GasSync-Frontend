import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Mail, Globe, MapPin, Search, PlusCircle } from 'lucide-react';

export default function Help() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const faqs = [
    {
      icon: <MapPin size={24} className="text-[#34C759]" />,
      q: t('help.faq1Q'),
      a: t('help.faq1A')
    },
    {
      icon: <Search size={24} className="text-[#208AEF]" />,
      q: t('help.faq2Q'),
      a: t('help.faq2A')
    },
    {
      icon: <PlusCircle size={24} className="text-[#FF9500]" />,
      q: t('help.faq3Q'),
      a: t('help.faq3A')
    }
  ];

  const handleEmailSupport = () => {
    window.location.href = 'mailto:support@gassync.app';
  };

  const handleWebsite = () => {
    window.open('https://gassync.app', '_blank');
  };

  return (
    <div className="flex flex-col flex-1 bg-[#F8FAFC] relative overflow-hidden min-h-[calc(100vh-64px)]">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-[#34C759]/20 to-transparent -z-10" />

      <div className="pt-8 px-6 pb-20 relative z-10 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-gray-800 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-xl text-gray-900">{t('help.title')}</h1>
          <div className="w-11 h-11" />
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] mb-8 flex flex-col items-center">
          <div className="w-20 h-20 bg-[#E8F8EC] rounded-full flex items-center justify-center mb-6">
            <HelpCircle size={32} className="text-[#34C759]" />
          </div>
          <h2 className="font-semibold text-2xl text-gray-900 mb-2">{t('help.faqTitle')}</h2>
          <p className="font-medium text-[15px] text-gray-500 mb-8 text-center">{t('help.subtitle')}</p>

          <div className="w-full flex flex-col gap-4">
            {faqs.map((faq, index) => (
              <div key={index} className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl">
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center shrink-0">
                  {faq.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-gray-900 mb-1">{faq.q}</h3>
                  <p className="font-medium text-[13px] text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <h3 className="font-semibold text-lg text-gray-900 mb-2 ml-1">{t('help.contactUs')}</h3>
          
          <button 
            onClick={handleEmailSupport}
            className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#E8F8EC] rounded-full flex items-center justify-center">
                <Mail size={20} className="text-[#34C759]" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-base text-gray-900">Email Support</span>
                <span className="block font-medium text-xs text-gray-500">support@gassync.app</span>
              </div>
            </div>
          </button>

          <button 
            onClick={handleWebsite}
            className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#E8F8EC] rounded-full flex items-center justify-center">
                <Globe size={20} className="text-[#34C759]" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-base text-gray-900">Website</span>
                <span className="block font-medium text-xs text-gray-500">gassync.app</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
