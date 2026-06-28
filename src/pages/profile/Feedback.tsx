import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Loader2, Star, AlertOctagon } from 'lucide-react';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/Toast';

export default function Feedback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const CATEGORIES = [
    { id: 'general', label: t('feedback.catGeneral', 'General Feedback'), icon: <MessageSquare size={20} /> },
    { id: 'feature', label: t('feedback.catFeature', 'Feature Request'), icon: <Star size={20} /> },
    { id: 'bug', label: t('feedback.catBug', 'Report a Bug'), icon: <AlertOctagon size={20} /> },
  ];
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) { showToast(t('feedback.missingFieldsMsg', 'Please fill in all fields.'), 'warning'); return; }
    if (subject.length < 2) { showToast(t('feedback.subjectShortMsg', 'Subject is too short.'), 'warning'); return; }
    if (message.length < 10) { showToast(t('feedback.msgShortMsg', 'Message must be at least 10 characters.'), 'warning'); return; }
    setLoading(true);
    try { await api.post('/feedback', { email: user?.email, subject, message, category }); showToast(t('feedback.successMsg', 'Thank you for your feedback!'), 'success'); navigate(-1); }
    catch (error: any) { showToast(error.response?.data?.message || t('feedback.errorMsg', 'Failed to submit feedback.'), 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col flex-1 bg-background relative overflow-hidden min-h-[calc(100vh-64px)]">
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-info/10 to-transparent -z-10" />
      <div className="pt-8 px-6 pb-20 relative z-10 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-surface rounded-full flex items-center justify-center shadow-premium-sm text-textPrimary hover:bg-surfaceMuted transition-colors"><ArrowLeft size={20} /></button>
          <h1 className="font-semibold text-xl text-textPrimary">{t('profile.feedback')}</h1>
          <div className="w-11 h-11" />
        </div>
        <p className="font-medium text-[15px] text-textMuted mb-8 ml-1">{t('feedback.pageSubtitle', 'We would love to hear your thoughts and suggestions.')}</p>
        <form onSubmit={handleSubmit} className="flex flex-col w-full">
          <h3 className="font-semibold text-sm text-textPrimary mb-3 ml-1">{t('feedback.feedbackType', 'Feedback Type')}</h3>
          <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-[15px] whitespace-nowrap transition-all duration-200 ${isSelected ? 'bg-primary text-white shadow-md shadow-primary/20' : 'premium-card text-textSecondary hover:bg-surfaceMuted'}`}>
                  <span className={isSelected ? 'text-white' : 'text-primary'}>{cat.icon}</span>{cat.label}
                </button>
              );
            })}
          </div>
          <h3 className="font-semibold text-sm text-textPrimary mb-3 ml-1">{t('feedback.subject', 'Subject')}</h3>
          <div className="premium-card p-2 mb-8">
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('feedback.subjectPlaceholder', 'Briefly describe your feedback')} className="w-full h-14 px-4 bg-transparent border-transparent outline-none font-medium text-textPrimary placeholder:text-textMuted" disabled={loading} maxLength={100} />
          </div>
          <h3 className="font-semibold text-sm text-textPrimary mb-3 ml-1">{t('feedback.message', 'Message')}</h3>
          <div className="premium-card p-2">
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('feedback.messagePlaceholder', 'Please provide detailed information...')} className="w-full h-40 p-4 bg-transparent border-transparent outline-none font-medium text-textPrimary placeholder:text-textMuted resize-none" disabled={loading} maxLength={1000} />
          </div>
          <button type="submit" disabled={loading || !subject.trim() || !message.trim()} className="btn-primary w-full h-14 mt-8 rounded-full text-lg disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? <Loader2 size={24} className="animate-spin" /> : t('feedback.submit', 'Submit Feedback')}
          </button>
        </form>
      </div>
    </div>
  );
}
