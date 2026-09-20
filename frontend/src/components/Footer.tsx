import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { discoveryApi } from '../api.ts';
import { useToast } from '../context/ToastContext.tsx';
import { useI18n, LanguageSwitcher } from '../i18n/index.tsx';
import { BrandLogo } from './BrandLogo.tsx';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { t } = useI18n();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error(t('footer.subscribeInvalid'));
      return;
    }
    setSubmitting(true);
    try {
      await discoveryApi.subscribeNewsletter(email);
      toast.success(t('footer.subscribeSuccess'));
      setEmail('');
    } catch (err: any) {
      toast.error(err.message || t('footer.subscribeFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="tta-footer">
      {/* Brand row — official dark-surface logo, large */}
      <div className="footer-brand-row">
        <div className="footer-brand-text">
          <Link to="/" aria-label="ThinkTank Academia — Home">
            <BrandLogo surface="dark" className="footer-brand-logo" />
          </Link>
          <div className="footer-social-links">
            <span className="social-badge">{t('footer.badge1')}</span>
            <span className="social-badge">{t('footer.badge2')}</span>
            <span className="social-badge">{t('footer.badge3')}</span>
          </div>
        </div>
        <div>
          <p className="footer-tagline">{t('brand.tagline')}</p>
          <p className="footer-desc">{t('footer.desc')}</p>
        </div>
      </div>

      <div className="footer-top">
        {/* Education column */}
        <div className="footer-col">
          <h4 className="footer-heading">{t('footer.educationTitle')}</h4>
          <ul className="footer-links">
            <li><Link to="/courses">{t('nav.courses')}</Link></li>
            <li><Link to="/job-prep">{t('drawer.jobPrepFull')}</Link></li>
            <li><Link to="/academic">{t('drawer.academicFull')}</Link></li>
            <li><Link to="/quizzes">{t('drawer.quizzesFull')}</Link></li>
            <li><Link to="/search">{t('nav.search')}</Link></li>
          </ul>
        </div>

        {/* Ideas column */}
        <div className="footer-col">
          <h4 className="footer-heading">{t('footer.ideasTitle')}</h4>
          <ul className="footer-links">
            <li><Link to="/books">{t('drawer.booksFull')}</Link></li>
            <li><Link to="/knowledge">{t('drawer.knowledgeFull')}</Link></li>
            <li><Link to="/world">{t('drawer.worldFull')}</Link></li>
            <li><Link to="/humanity">{t('drawer.humanityFull')}</Link></li>
            <li><Link to="/society">{t('drawer.societyFull')}</Link></li>
            <li><Link to="/articles">{t('drawer.articlesFull')}</Link></li>
          </ul>
        </div>

        {/* Organization column */}
        <div className="footer-col">
          <h4 className="footer-heading">{t('drawer.info')}</h4>
          <ul className="footer-links">
            <li><Link to="/about">{t('footer.about')}</Link></li>
            <li><Link to="/contact">{t('footer.contact')}</Link></li>
            <li><Link to="/privacy">{t('drawer.privacy')}</Link></li>
            <li><Link to="/terms">{t('drawer.terms')}</Link></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="footer-col">
          <h4 className="footer-heading">{t('footer.stayTitle')}</h4>
          <p className="newsletter-text">{t('footer.newsletterText')}</p>
          <form onSubmit={handleSubscribe} className="footer-newsletter-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('footer.emailPlaceholder')}
              required
              aria-label={t('footer.emailPlaceholder')}
            />
            <button type="submit" disabled={submitting}>
              {submitting ? '…' : t('actions.subscribe')}
            </button>
          </form>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} ThinkTank Academia. {t('footer.rights')}</p>
        <p className="footer-statement">{t('footer.statement')}</p>
      </div>
    </footer>
  );
};
