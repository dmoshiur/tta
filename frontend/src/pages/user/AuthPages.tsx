import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { authApi } from '../../api.ts';
import { useI18n } from '../../i18n/index.tsx';
import { BrandLogo } from '../../components/BrandLogo.tsx';

/** Branded showcase panel beside the auth forms — official dark-surface logo. */
const AuthShowcase: React.FC = () => {
  const { t } = useI18n();
  return (
    <aside className="auth-brand-panel" aria-hidden="true">
      <Link to="/" tabIndex={-1}>
        <BrandLogo surface="dark" />
      </Link>

      <h2 className="auth-panel-heading">{t('auth.showcaseHeading')}</h2>
      <p className="auth-panel-lead">{t('auth.showcaseLead')}</p>

      <ul className="auth-panel-points">
        <li><span>✦</span>{t('auth.point1')}</li>
        <li><span>✦</span>{t('auth.point2')}</li>
        <li><span>✦</span>{t('auth.point3')}</li>
        <li><span>✦</span>{t('auth.point4')}</li>
      </ul>

      <figure className="auth-panel-quote">
        <blockquote>{t('auth.quote')}</blockquote>
        <figcaption>{t('auth.quoteBy')}</figcaption>
      </figure>
    </aside>
  );
};

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t('auth.signInTitle'));
      navigate(redirect);
    } catch (err: any) {
      toast.error(err.message || t('states.errorBody'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <AuthShowcase />
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="brand-logo" tabIndex={-1}>
            <BrandLogo surface="light" />
          </Link>
          <p className="auth-eyebrow">{t('auth.welcomeEyebrow')}</p>
          <h2>{t('auth.signInTitle')}</h2>
          <p className="auth-lead">{t('auth.signInLead')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="form-field">
            <span>{t('auth.email')}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
            />
          </label>

          <label className="form-field">
            <div className="label-with-link">
              <span>{t('auth.password')}</span>
              <Link to="/forgot-password" tabIndex={-1} className="forgot-link">
                {t('auth.forgot')}
              </Link>
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <button type="submit" disabled={loading} className="btn-primary auth-submit-btn btn-shine">
            {loading ? t('auth.signingIn') : `${t('auth.signInCta')} →`}
          </button>
        </form>

        <div className="auth-footer-prompt">
          <span>{t('auth.noAccount')}</span>
          <Link to={`/register?redirect=${encodeURIComponent(redirect)}`} className="switch-auth-link">
            {t('auth.createAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t('auth.passwordRule'));
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success(t('auth.registerTitle'));
      navigate(redirect);
    } catch (err: any) {
      toast.error(err.message || t('states.errorBody'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <AuthShowcase />
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="brand-logo" tabIndex={-1}>
            <BrandLogo surface="light" />
          </Link>
          <p className="auth-eyebrow">{t('auth.joinEyebrow')}</p>
          <h2>{t('auth.registerTitle')}</h2>
          <p className="auth-lead">{t('auth.registerLead')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="form-field">
            <span>{t('auth.fullName')}</span>
            <input
              type="text"
              required
              minLength={2}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.namePlaceholder')}
            />
          </label>

          <label className="form-field">
            <span>{t('auth.email')}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
            />
          </label>

          <label className="form-field">
            <span>{t('auth.passwordRule')}</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <p className="terms-notice">
            {t('auth.termsNotice')} <Link to="/terms">{t('auth.terms')}</Link> {t('auth.and')}{' '}
            <Link to="/privacy">{t('auth.privacy')}</Link>.
          </p>

          <button type="submit" disabled={loading} className="btn-primary auth-submit-btn btn-shine">
            {loading ? t('auth.creating') : `${t('auth.registerCta')} →`}
          </button>
        </form>

        <div className="auth-footer-prompt">
          <span>{t('auth.haveAccount')}</span>
          <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="switch-auth-link">
            {t('auth.signInCta')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setSubmitted(true);
      if (res.devLink) setDevLink(res.devLink);
      toast.success(t('auth.checkEmail'));
    } catch (err: any) {
      toast.error(err.message || t('states.errorBody'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <AuthShowcase />
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-eyebrow">{t('auth.forgot')}</p>
          <h2>{t('auth.forgotTitle')}</h2>
          <p className="auth-lead">{t('auth.forgotLead')}</p>
        </div>

        {submitted ? (
          <div className="state-box success-box">
            <div className="success-icon">✓</div>
            <h3>{t('auth.checkEmail')}</h3>
            <p>{t('auth.emailBody', { email })}</p>
            {devLink && (
              <div className="dev-link-callout">
                <small>Development environment quick reset:</small>
                <a href={devLink}>Open password reset form →</a>
              </div>
            )}
            <Link to="/login" className="btn-secondary" style={{ marginTop: '1rem' }}>
              ← {t('auth.signInCta')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="form-field">
              <span>{t('auth.email')}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
              />
            </label>

            <button type="submit" disabled={loading} className="btn-primary auth-submit-btn btn-shine">
              {loading ? '…' : `${t('auth.sendLink')} →`}
            </button>

            <div className="auth-footer-prompt">
              <Link to="/login" className="switch-auth-link">
                ← {t('auth.backToSignIn')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t('auth.mismatch'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('auth.passwordRule'));
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      toast.success(t('auth.resetSuccess'));
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || t('states.errorBody'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-card">
          <h2>{t('auth.invalidLink')}</h2>
          <p>{t('auth.invalidLinkBody')}</p>
          <Link to="/forgot-password" className="btn-primary">
            {t('auth.requestNew')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper">
      <AuthShowcase />
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-eyebrow">{t('auth.resetTitle')}</p>
          <h2>{t('auth.resetTitle')}</h2>
          <p className="auth-lead">{t('auth.resetLead')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="form-field">
            <span>{t('auth.passwordRule')}</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <label className="form-field">
            <span>{t('auth.confirmPassword')}</span>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <button type="submit" disabled={loading} className="btn-primary auth-submit-btn btn-shine">
            {loading ? '…' : `${t('actions.save')} →`}
          </button>
        </form>
      </div>
    </div>
  );
};
