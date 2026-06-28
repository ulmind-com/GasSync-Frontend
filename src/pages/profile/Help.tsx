import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Mail, Globe, ChevronDown } from 'lucide-react';

export default function Help() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const FAQS = [
    { q: t('help.q1'), a: t('help.a1') }, { q: t('help.q2'), a: t('help.a2') },
    { q: t('help.q3'), a: t('help.a3') }, { q: t('help.q4'), a: t('help.a4') }, { q: t('help.q5'), a: t('help.a5') }
  ];

  return (
    <div className="flex flex-col flex-1 bg-background relative overflow-hidden min-h-[calc(100vh-64px)]">
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-primary/10 to-transparent -z-10" />
      <div className="pt-8 px-6 pb-20 relative z-10 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-surface rounded-full flex items-center justify-center shadow-premium-sm text-textPrimary hover:bg-surfaceMuted transition-colors"><ArrowLeft size={20} /></button>
          <h1 className="font-semibold text-xl text-textPrimary">{t('profile.help')}</h1>
          <div className="w-11 h-11" />
        </div>
        <div className="premium-card p-8 mb-8 flex flex-col items-center">
          <div className="w-20 h-20 bg-avatarBg rounded-full flex items-center justify-center mb-6"><HelpCircle size={32} className="text-primary" /></div>
          <h2 className="font-semibold text-2xl text-textPrimary mb-2">{t('help.faqTitle')}</h2>
          <p className="font-medium text-[15px] text-textMuted mb-8 text-center">{t('help.subtitle')}</p>
          <div className="w-full flex flex-col gap-3">
            {FAQS.map((faq, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <div key={index} className={`bg-surfaceMuted rounded-2xl border transition-colors duration-200 overflow-hidden ${isExpanded ? 'border-primary' : 'border-transparent'}`}>
                  <button onClick={() => setExpandedIndex(isExpanded ? null : index)} className="w-full flex items-center justify-between p-5 text-left">
                    <span className={`font-semibold text-[15px] pr-4 transition-colors duration-200 ${isExpanded ? 'text-primary' : 'text-textPrimary'}`}>{faq.q}</span>
                    <ChevronDown size={20} className={`shrink-0 transform transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'text-textMuted'}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden"><div className="p-5 pt-0"><p className="font-medium text-[14px] text-textMuted leading-relaxed">{faq.a}</p></div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="premium-card p-6 flex flex-col gap-4">
          <h3 className="font-semibold text-lg text-textPrimary mb-2 ml-1">{t('help.contactUs')}</h3>
          <button onClick={() => { window.location.href = 'mailto:support@gassync.app'; }} className="flex items-center justify-between p-4 bg-surfaceMuted hover:bg-surfaceMuted/80 rounded-2xl transition-colors">
            <div className="flex items-center gap-4"><div className="w-10 h-10 bg-avatarBg rounded-full flex items-center justify-center"><Mail size={20} className="text-primary" /></div><div className="text-left"><span className="block font-semibold text-base text-textPrimary">Email Support</span><span className="block font-medium text-xs text-textMuted">support@gassync.app</span></div></div>
          </button>
          <button onClick={() => { window.open('https://gassync.app', '_blank'); }} className="flex items-center justify-between p-4 bg-surfaceMuted hover:bg-surfaceMuted/80 rounded-2xl transition-colors">
            <div className="flex items-center gap-4"><div className="w-10 h-10 bg-avatarBg rounded-full flex items-center justify-center"><Globe size={20} className="text-primary" /></div><div className="text-left"><span className="block font-semibold text-base text-textPrimary">Website</span><span className="block font-medium text-xs text-textMuted">https://gassync.app</span></div></div>
          </button>
        </div>
      </div>
    </div>
  );
}
