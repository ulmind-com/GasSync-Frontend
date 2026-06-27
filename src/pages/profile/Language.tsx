import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', isoCode: 'us' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', isoCode: 'bd' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', isoCode: 'es' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', isoCode: 'fr' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', isoCode: 'de' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', isoCode: 'it' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', isoCode: 'pt' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', isoCode: 'in' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文', isoCode: 'cn' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', isoCode: 'jp' },
];

export default function Language() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex flex-col flex-1 bg-[#F8FAFC] relative overflow-hidden min-h-[calc(100vh-64px)]">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-[#208AEF]/20 to-transparent -z-10" />

      <div className="pt-8 px-6 pb-20 relative z-10 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-gray-800 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-xl text-gray-900">{t('profile.language')}</h1>
          <div className="w-11 h-11" />
        </div>

        <div className="bg-white rounded-3xl p-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col">
          {LANGUAGES.map((lang, index) => (
            <React.Fragment key={lang.code}>
              <button 
                onClick={() => changeLanguage(lang.code)}
                className={`flex items-center justify-between p-4 w-full text-left rounded-2xl transition-colors ${i18n.language === lang.code ? 'bg-[#E8F8EC]' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center">
                  <div className="w-8 flex justify-center mr-3 shrink-0">
                    <img src={`https://flagcdn.com/w40/${lang.isoCode}.png`} alt={lang.label} className="w-5 h-auto rounded-[2px] shadow-sm" />
                  </div>
                  <div>
                    <span className={`block font-semibold text-base ${i18n.language === lang.code ? 'text-[#34C759]' : 'text-gray-900'}`}>
                      {lang.nativeLabel}
                    </span>
                    <span className="block font-medium text-sm text-gray-500 mt-0.5">
                      {lang.label}
                    </span>
                  </div>
                </div>
                {i18n.language === lang.code && (
                  <Check size={20} className="text-[#34C759]" />
                )}
              </button>
              {index < LANGUAGES.length - 1 && (
                <div className="h-px bg-gray-100 w-full my-1" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
