import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Camera, CheckCircle } from 'lucide-react';

export default function HowToUse() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const steps = [
    { icon: <Search size={28} className="text-primary" />, title: t('howToUse.step1Title'), desc: t('howToUse.step1Desc') },
    { icon: <Camera size={28} className="text-info" />, title: t('howToUse.step2Title'), desc: t('howToUse.step2Desc') },
    { icon: <CheckCircle size={28} className="text-warning" />, title: t('howToUse.step3Title'), desc: t('howToUse.step3Desc') },
  ];

  return (
    <div className="flex flex-col flex-1 bg-background relative overflow-hidden min-h-[calc(100vh-64px)]">
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-primary/10 to-transparent -z-10" />
      <div className="pt-8 px-6 pb-20 relative z-10 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-surface rounded-full flex items-center justify-center shadow-premium-sm text-textPrimary hover:bg-surfaceMuted transition-colors"><ArrowLeft size={20} /></button>
          <h1 className="font-semibold text-xl text-textPrimary">{t('howToUse.title')}</h1>
          <div className="w-11 h-11" />
        </div>
        <div className="premium-card p-8 mb-8 flex flex-col items-center">
          <div className="w-20 h-20 bg-avatarBg rounded-full flex items-center justify-center mb-6"><Search size={32} className="text-primary" /></div>
          <h2 className="font-semibold text-2xl text-textPrimary mb-2">{t('howToUse.title')}</h2>
          <p className="font-medium text-[15px] text-textMuted mb-8 text-center">{t('howToUse.subtitle')}</p>
          <div className="w-full flex flex-col gap-6">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-5 p-5 bg-surfaceMuted rounded-2xl">
                <div className="w-14 h-14 bg-surface rounded-xl shadow-premium-sm flex items-center justify-center shrink-0">{step.icon}</div>
                <div><h3 className="font-semibold text-lg text-textPrimary mb-1">{step.title}</h3><p className="font-medium text-sm text-textMuted leading-relaxed">{step.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => navigate('/')} className="btn-primary w-full h-14 rounded-full text-lg">{t('common.getStarted')}</button>
      </div>
    </div>
  );
}
