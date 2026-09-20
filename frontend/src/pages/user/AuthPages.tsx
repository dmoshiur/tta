import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { authApi } from '../../api.ts';

/** Branded showcase panel shown beside the login / registration forms. */
const AuthShowcase: React.FC = () => (
  <aside className="auth-brand-panel" aria-hidden="true">
    <Link to="/" className="brand-logo light" tabIndex={-1}>
      <img src="/icon.svg" alt="" className="brand-monogram-img brand-monogram-lg" />
      <div className="brand-text">
        <span className="brand-name">ThinkTank</span>
        <span className="brand-sub">ACADEMIA</span>
      </div>
    </Link>

    <h2 className="auth-panel-heading">
      Learn • Think •<br />Understand • Unite
    </h2>
    <p className="auth-panel-lead">
      A multidisciplinary home for structured courses, model tests, editorial
      writing, and a library built for curious minds.
    </p>

    <ul className="auth-panel-points">
      <li><span>✦</span> Structured courses with modules &amp; lessons</li>
      <li><span>✦</span> Model tests with instant scoring &amp; analytics</li>
      <li><span>✦</span> Editorial articles, books &amp; summaries</li>
      <li><span>✦</span> Progress tracking, bookmarks &amp; notifications</li>
    </ul>

    <figure className="auth-panel-quote">
      <blockquote>“Education is the passport to the future.”</blockquote>
      <figcaption>— The ThinkTank Ethos</figcaption>
    </figure>
  </aside>
);

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
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
      toast.success('Welcome back to ThinkTank Academia!');
      navigate(redirect);
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
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
            <img src="/icon.svg" alt="" className="brand-monogram-img" />
            <div className="brand-text">
              <span className="brand-name">ThinkTank</span>
              <span className="brand-sub">ACADEMIA</span>
            </div>
          </Link>
          <p className="auth-eyebrow">WELCOME BACK</p>
          <h2>Sign In to Your Account</h2>
          <p className="auth-lead">Continue your courses, review quizzes, and track your progress.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="form-field">
            <span>Email Address</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="form-field">
            <div className="label-with-link">
              <span>Password</span>
              <Link to="/forgot-password" tabIndex={-1} className="forgot-link">
                Forgot password?
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

          <button type="submit" disabled={loading} className="btn-primary auth-submit-btn">
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <div className="auth-footer-prompt">
          <span>Don't have an account yet?</span>
          <Link to={`/register?redirect=${encodeURIComponent(redirect)}`} className="switch-auth-link">
            Create an Account
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
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Your account has been created! Welcome to ThinkTank Academia.');
      navigate(redirect);
    } catch (err: any) {
      toast.error(err.message || 'Registration failed.');
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
            <img src="/icon.svg" alt="" className="brand-monogram-img" />
            <div className="brand-text">
              <span className="brand-name">ThinkTank</span>
              <span className="brand-sub">ACADEMIA</span>
            </div>
          </Link>
          <p className="auth-eyebrow">JOIN THE COMMUNITY</p>
          <h2>Create Your Learner Account</h2>
          <p className="auth-lead">Free access to structured courses, model tests, and editorial insights.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="form-field">
            <span>Full Name</span>
            <input
              type="text"
              required
              minLength={2}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Lin"
            />
          </label>

          <label className="form-field">
            <span>Email Address</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="form-field">
            <span>Password (minimum 8 characters)</span>
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
            By registering, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
          </p>

          <button type="submit" disabled={loading} className="btn-primary auth-submit-btn">
            {loading ? 'Creating Account…' : 'Create Free Account →'}
          </button>
        </form>

        <div className="auth-footer-prompt">
          <span>Already registered?</span>
          <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="switch-auth-link">
            Sign In
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setSubmitted(true);
      if (res.devLink) setDevLink(res.devLink);
      toast.success('Reset instructions sent.');
    } catch (err: any) {
      toast.error(err.message || 'Could not send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <AuthShowcase />
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-eyebrow">RECOVER ACCESS</p>
          <h2>Reset Your Password</h2>
          <p className="auth-lead">Enter your email and we will send a secure link to reset your password.</p>
        </div>

        {submitted ? (
          <div className="state-box success-box">
            <div className="success-icon">✓</div>
            <h3>Check Your Email</h3>
            <p>If an account exists for <strong>{email}</strong>, a password reset link has been dispatched.</p>
            {devLink && (
              <div className="dev-link-callout">
                <small>Development environment quick reset:</small>
                <a href={devLink}>Open Password Reset Form →</a>
              </div>
            )}
            <Link to="/login" className="btn-secondary" style={{ marginTop: '1rem' }}>
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="form-field">
              <span>Your Account Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <button type="submit" disabled={loading} className="btn-primary auth-submit-btn">
              {loading ? 'Sending link…' : 'Send Password Reset Link →'}
            </button>

            <div className="auth-footer-prompt">
              <Link to="/login" className="switch-auth-link">
                ← Back to Sign In
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

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      toast.success('Your password has been reset! Please sign in with your new password.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Password reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-card">
          <h2>Invalid Reset Link</h2>
          <p>No reset token was found in the link. Please request a new link.</p>
          <Link to="/forgot-password" className="btn-primary">Request New Link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper">
      <AuthShowcase />
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-eyebrow">CHOOSE NEW CREDENTIALS</p>
          <h2>Set a New Password</h2>
          <p className="auth-lead">Choose a strong, unique password for your ThinkTank account.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="form-field">
            <span>New Password (min 8 characters)</span>
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
            <span>Confirm New Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <button type="submit" disabled={loading} className="btn-primary auth-submit-btn">
            {loading ? 'Saving…' : 'Update Password →'}
          </button>
        </form>
      </div>
    </div>
  );
};
