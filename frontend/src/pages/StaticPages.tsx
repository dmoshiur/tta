import React, { useState } from 'react';
import { discoveryApi } from '../api.ts';
import { useToast } from '../context/ToastContext.tsx';
import { useI18n } from '../i18n/index.tsx';
import { Reveal } from '../components/Reveal.tsx';

export const AboutPage: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="page-container content-reading-page">
      <header className="page-header">
        <Reveal direction="up">
          <p className="page-eyebrow">{t('static.about.eyebrow')}</p>
          <h1 className="page-title">{t('static.about.title')}</h1>
          <p className="page-lead">{t('static.about.lead')}</p>
        </Reveal>
      </header>

      <div className="reading-body">
        <h2>{t('static.about.purposeTitle')}</h2>
        <p>{t('static.about.purpose')}</p>

        <h2>{t('static.about.pillarsTitle')}</h2>
        <p>{t('static.about.pillarsIntro')}</p>
        <ol>
          <li><strong>{t('static.about.p1t')}</strong> {t('static.about.p1')}</li>
          <li><strong>{t('static.about.p2t')}</strong> {t('static.about.p2')}</li>
          <li><strong>{t('static.about.p3t')}</strong> {t('static.about.p3')}</li>
          <li><strong>{t('static.about.p4t')}</strong> {t('static.about.p4')}</li>
          <li><strong>{t('static.about.p5t')}</strong> {t('static.about.p5')}</li>
          <li><strong>{t('static.about.p6t')}</strong> {t('static.about.p6')}</li>
          <li><strong>{t('static.about.p7t')}</strong> {t('static.about.p7')}</li>
        </ol>

        <h2>{t('static.about.standardsTitle')}</h2>
        <p>{t('static.about.standardsIntro')}</p>
        <ul>
          <li><strong>{t('static.about.s1t')}</strong> {t('static.about.s1')}</li>
          <li><strong>{t('static.about.s2t')}</strong> {t('static.about.s2')}</li>
          <li><strong>{t('static.about.s3t')}</strong> {t('static.about.s3')}</li>
        </ul>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await discoveryApi.sendContact(form);
      setSent(true);
      toast.success(t('static.contact.sentToast'));
    } catch (err: any) {
      toast.error(err.message || t('static.contact.failToast'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container auth-form-page">
      <header className="page-header">
        <Reveal direction="up">
          <p className="page-eyebrow">{t('static.contact.eyebrow')}</p>
          <h1 className="page-title">{t('static.contact.title')}</h1>
          <p className="page-lead">{t('static.contact.lead')}</p>
        </Reveal>
      </header>

      {sent ? (
        <div className="state-box success-box">
          <div className="success-icon">✓</div>
          <h3>{t('static.contact.successTitle')}</h3>
          <p>{t('static.contact.successBody')}</p>
          <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }} className="btn-secondary">
            {t('static.contact.sendAnother')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="standard-form card-form">
          <label className="form-field">
            <span>{t('static.contact.name')}</span>
            <input
              type="text"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('static.contact.namePh')}
            />
          </label>

          <label className="form-field">
            <span>{t('static.contact.email')}</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </label>

          <label className="form-field">
            <span>{t('static.contact.subject')}</span>
            <input
              type="text"
              required
              minLength={3}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder={t('static.contact.subjectPh')}
            />
          </label>

          <label className="form-field">
            <span>{t('static.contact.message')}</span>
            <textarea
              required
              rows={5}
              minLength={10}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder={t('static.contact.messagePh')}
            />
          </label>

          <button type="submit" disabled={submitting} className="btn-primary form-submit-btn btn-shine">
            {submitting ? t('static.contact.sending') : `${t('static.contact.send')} →`}
          </button>
        </form>
      )}
    </div>
  );
};

export const PrivacyPage: React.FC = () => {
  const { t } = useI18n();
  const lastUpdated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="page-container content-reading-page">
      <header className="page-header">
        <p className="page-eyebrow">{t('static.privacy.eyebrow')}</p>
        <h1 className="page-title">{t('static.privacy.title')}</h1>
        <p className="page-lead">{t('static.lastUpdated', { date: lastUpdated })}</p>
      </header>

      <div className="reading-body">
        <h2>{t('static.privacy.c1Title')}</h2>
        <p>{t('static.privacy.c1')}</p>

        <h2>{t('static.privacy.c2Title')}</h2>
        <ul>
          <li><strong>{t('static.privacy.i1t')}</strong> {t('static.privacy.i1')}</li>
          <li><strong>{t('static.privacy.i2t')}</strong> {t('static.privacy.i2')}</li>
          <li><strong>{t('static.privacy.i3t')}</strong> {t('static.privacy.i3')}</li>
        </ul>

        <h2>{t('static.privacy.c3Title')}</h2>
        <p>{t('static.privacy.c3')}</p>

        <h2>{t('static.privacy.c4Title')}</h2>
        <p>{t('static.privacy.c4')}</p>
      </div>
    </div>
  );
};

export const TermsPage: React.FC = () => {
  const { t } = useI18n();
  const lastUpdated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="page-container content-reading-page">
      <header className="page-header">
        <p className="page-eyebrow">{t('static.terms.eyebrow')}</p>
        <h1 className="page-title">{t('static.terms.title')}</h1>
        <p className="page-lead">{t('static.lastUpdated', { date: lastUpdated })}</p>
      </header>

      <div className="reading-body">
        <h2>{t('static.terms.c1Title')}</h2>
        <p>{t('static.terms.c1')}</p>

        <h2>{t('static.terms.c2Title')}</h2>
        <p>{t('static.terms.c2')}</p>

        <h2>{t('static.terms.c3Title')}</h2>
        <p>{t('static.terms.c3')}</p>
      </div>
    </div>
  );
};
