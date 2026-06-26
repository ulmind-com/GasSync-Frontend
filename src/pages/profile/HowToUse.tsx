import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Camera, CheckCircle } from 'lucide-react';

export default function HowToUse() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const steps = [
    {
      icon: <Search size={28} className="text-[#34C759]" />,
      title: t('howToUse.step1Title'),
      desc: t('howToUse.step1Desc')
    },
    {
      icon: <Camera size={28} className="text-[#208AEF]" />,
      title: t('howToUse.step2Title'),
      desc: t('howToUse.step2Desc')
    },
    {
      icon: <CheckCircle size={28} className="text-[#FF9500]" />,
      title: t('howToUse.step3Title'),
      desc: t('howToUse.step3Desc')
    }
  ];

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
          <h1 className="font-semibold text-xl text-gray-900">{t('howToUse.title')}</h1>
          <div className="w-11 h-11" />
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] mb-8 flex flex-col items-center">
          <div className="w-20 h-20 bg-[#E8F8EC] rounded-full flex items-center justify-center mb-6">
            <Search size={32} className="text-[#34C759]" />
          </div>
          <h2 className="font-semibold text-2xl text-gray-900 mb-2">{t('howToUse.title')}</h2>
          <p className="font-medium text-[15px] text-gray-500 mb-8 text-center">{t('howToUse.subtitle')}</p>

          <div className="w-full flex flex-col gap-6">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-5 p-5 bg-gray-50 rounded-2xl">
                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                  {step.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">{step.title}</h3>
                  <p className="font-medium text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate('/home')}
          className="w-full h-14 bg-[#34C759] hover:bg-[#2EB350] text-white rounded-full font-semibold text-lg flex items-center justify-center shadow-lg shadow-[#34C759]/30 transition-all"
        >
          {t('common.getStarted')}
        </button>
      </div>
    </div>
  );
}
