import React from 'react';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading content…' }) => (
  <div className="state-box loading-box" role="status">
    <div className="tta-spinner" aria-hidden="true" />
    <p>{message}</p>
  </div>
);

export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}> = ({
  title = 'No items found',
  message = 'There is no published content matching your request.',
  actionText,
  actionHref,
  onAction,
}) => (
  <div className="state-box empty-box">
    <div className="empty-icon" aria-hidden="true">∅</div>
    <h3>{title}</h3>
    <p>{message}</p>
    {(actionText && actionHref) && (
      <a href={actionHref} className="btn-secondary">
        {actionText}
      </a>
    )}
    {(actionText && onAction) && (
      <button onClick={onAction} className="btn-secondary">
        {actionText}
      </button>
    )}
  </div>
);

export const ErrorState: React.FC<{
  error?: string;
  onRetry?: () => void;
}> = ({ error = 'An unexpected error occurred.', onRetry }) => (
  <div className="state-box error-box" role="alert">
    <div className="error-icon" aria-hidden="true">⚠</div>
    <h3>Something went wrong</h3>
    <p>{error}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn-primary">
        Try again
      </button>
    )}
  </div>
);
