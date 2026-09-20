import React from 'react';
import { Link } from 'react-router-dom';

/* Shared building blocks for the Super Admin console pages. */

export const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const formatDuration = (ms: number): string => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`);

export const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const formatNumber = (value: number): string => value.toLocaleString();

/** Compact operational metric card used across the console. */
export const MetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'info';
  linkTo?: string;
}> = ({ label, value, hint, tone = 'default', linkTo }) => {
  const body = (
    <>
      <span className="sa-metric-label">{label}</span>
      <strong className="sa-metric-value">{value}</strong>
      {hint && <span className="sa-metric-hint">{hint}</span>}
    </>
  );
  return linkTo ? (
    <Link to={linkTo} className={`sa-metric-card tone-${tone}`}>
      {body}
    </Link>
  ) : (
    <div className={`sa-metric-card tone-${tone}`}>{body}</div>
  );
};

/** Section wrapper with heading + optional action. */
export const ConsoleSection: React.FC<{
  title: string;
  tag?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, tag, action, children }) => (
  <section className="sa-section">
    <div className="sa-section-head">
      <h2 className="admin-section-heading">
        {title}
        {tag && <span className="sa-section-tag">{tag}</span>}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

/** Status pill for log rows (HTTP statuses, mail states, health). */
export const LogPill: React.FC<{ status: number | string; className?: string }> = ({ status, className = '' }) => {
  const code = typeof status === 'number' ? status : 0;
  let tone = 'neutral';
  if (typeof status === 'number') {
    if (code >= 500) tone = 'bad';
    else if (code >= 400) tone = 'warn';
    else if (code >= 300) tone = 'info';
    else if (code >= 200) tone = 'good';
  } else {
    const s = String(status).toUpperCase();
    if (['SENT', 'OK', 'ONLINE', 'ACTIVE', 'PASS', 'PUBLISHED'].includes(s)) tone = 'good';
    else if (['FAILED', 'ERROR', 'OFFLINE', 'DOWN'].includes(s)) tone = 'bad';
    else if (['SKIPPED', 'PENDING', 'DRAFT'].includes(s)) tone = 'warn';
  }
  return <span className={`sa-log-pill sa-pill-${tone} ${className}`}>{status}</span>;
};

/** Simple pagination control shared by log tables. */
export const Pager: React.FC<{
  page: number;
  pages: number;
  onPage: (page: number) => void;
}> = ({ page, pages, onPage }) =>
  pages > 1 ? (
    <div className="pagination-nav">
      <button className="pagination-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← Prev
      </button>
      <span className="pagination-info">
        Page {page} of {pages}
      </span>
      <button className="pagination-btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next →
      </button>
    </div>
  ) : null;

/** Standard console page header. */
export const ConsoleHeader: React.FC<{
  title: string;
  desc: string;
  children?: React.ReactNode;
}> = ({ title, desc, children }) => (
  <header className="admin-page-header">
    <div className="admin-header-title-wrap">
      <span className="admin-security-pill">SUPER ADMIN</span>
      <h1 className="admin-page-title">{title}</h1>
      <p className="admin-page-desc">{desc}</p>
    </div>
    {children && <div className="admin-quick-nav">{children}</div>}
  </header>
);
