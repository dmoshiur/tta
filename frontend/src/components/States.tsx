import React from 'react';
import { useI18n } from '../i18n/index.tsx';

/**
 * Loading / Empty / Error states + premium skeleton screens.
 * Never shows raw technical errors — friendly copy with a retry affordance.
 */

export const LoadingState: React.FC<{ message?: string }> = ({ message }) => {
  const { t } = useI18n();
  return (
    <div className="state-box loading-box" role="status" aria-live="polite">
      <div className="tta-spinner" aria-hidden="true" />
      <p>{message || t('states.loading')}</p>
    </div>
  );
};

export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}> = ({ title, message, actionText, actionHref, onAction }) => {
  const { t } = useI18n();
  return (
    <div className="state-box empty-box">
      <div className="empty-icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.8-3.8" />
          <path d="M8 11h6" />
        </svg>
      </div>
      <h3>{title || t('states.emptyTitle')}</h3>
      <p>{message || t('states.emptyBody')}</p>
      {actionText && actionHref && (
        <a href={actionHref} className="btn-secondary">
          {actionText}
        </a>
      )}
      {actionText && onAction && (
        <button onClick={onAction} className="btn-secondary">
          {actionText}
        </button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  error?: string;
  onRetry?: () => void;
}> = ({ error, onRetry }) => {
  const { t } = useI18n();
  return (
    <div className="state-box error-box" role="alert">
      <div className="error-icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v5" />
          <circle cx="12" cy="16.5" r="0.4" fill="currentColor" />
          <path d="M10.3 3.6 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
        </svg>
      </div>
      <h3>{t('states.errorTitle')}</h3>
      <p>{error && error.length < 120 ? error : t('states.errorBody')}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          {t('states.retry')}
        </button>
      )}
    </div>
  );
};

/* ── Skeletons ───────────────────────────────────────────────────────────── */

export const SkeletonCard: React.FC = () => (
  <div className="skeleton-card" aria-hidden="true">
    <div className="skeleton skel-media" />
    <div className="skel-body">
      <div className="skeleton skel-line" style={{ width: '38%' }} />
      <div className="skeleton skel-line" style={{ width: '92%', height: '1.1rem' }} />
      <div className="skeleton skel-line" style={{ width: '70%' }} />
      <div className="skeleton skel-line" style={{ width: '55%', marginBottom: 0 }} />
    </div>
  </div>
);

export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="skeleton-grid" aria-busy="true" aria-live="polite">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonHero: React.FC = () => (
  <div className="skeleton-hero" aria-busy="true" aria-hidden="true">
    <div>
      <div className="skeleton skel-line" style={{ width: '34%' }} />
      <div className="skeleton skel-line" style={{ width: '90%', height: '3rem' }} />
      <div className="skeleton skel-line" style={{ width: '72%', height: '3rem' }} />
      <div className="skeleton skel-line" style={{ width: '84%' }} />
      <div className="skeleton skel-line" style={{ width: '48%', height: '3rem', marginTop: '1.6rem' }} />
    </div>
    <div className="skeleton skel-block skel-visual" />
  </div>
);

export const SkeletonDetail: React.FC = () => (
  <div className="page-container" aria-busy="true" aria-hidden="true" style={{ maxWidth: 860 }}>
    <div className="skeleton skel-line" style={{ width: '26%' }} />
    <div className="skeleton skel-line" style={{ width: '88%', height: '2.6rem' }} />
    <div className="skeleton skel-line" style={{ width: '64%', height: '1.1rem' }} />
    <div className="skeleton skel-block" style={{ aspectRatio: '16/8', margin: '2rem 0' }} />
    {['100%', '96%', '92%', '98%', '80%', '60%'].map((w, i) => (
      <div key={i} className="skeleton skel-line" style={{ width: w }} />
    ))}
  </div>
);
