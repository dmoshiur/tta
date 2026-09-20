import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api.ts';
import { LoadingState, ErrorState } from '../../components/States.tsx';
import { ConsoleHeader, ConsoleSection, LogPill, MetricCard, Pager } from '../../components/admin/AdminBits.tsx';

/* SMTP Logs — full outgoing mail audit trail with status filtering. */

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'SENT', label: 'Sent' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'SKIPPED', label: 'Skipped' },
];

export const AdminSmtpLogsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [totals, setTotals] = useState({ sent: 0, failed: 0, skipped: 0 });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [term, setTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = { page, limit: 20 };
    if (status) params.status = status;
    if (term) params.q = term;
    adminApi
      .getSmtpLogs(params)
      .then((res) => {
        setItems(res.items);
        setTotals(res.totals);
        setPages(res.pages);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load SMTP logs.');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, [page, status, term]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setTerm(searchInput.trim());
  };

  if (loading && items.length === 0 && !error) return <LoadingState message="Loading SMTP logs…" />;
  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="page-container admin-hub-page">
      <ConsoleHeader
        title="SMTP Logs"
        desc="Every outgoing e-mail attempt — transactional, administrative and operational — with its delivery outcome."
      />

      <div className="sa-metrics-grid">
        <MetricCard label="Delivered" value={totals.sent} tone="good" hint="All time" />
        <MetricCard label="Failed" value={totals.failed} tone={totals.failed ? 'bad' : 'default'} hint="Transport rejected" />
        <MetricCard label="Skipped" value={totals.skipped} tone={totals.skipped ? 'warn' : 'default'} hint="SMTP not configured" />
        <MetricCard label="Total Attempts" value={totals.sent + totals.failed + totals.skipped} tone="info" />
      </div>

      <ConsoleSection title="Delivery Audit Trail">
        <div className="catalog-filters-bar">
          <div className="sa-filter-tabs" role="tablist">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`sa-filter-tab${status === f.value ? ' active' : ''}`}
                onClick={() => {
                  setPage(1);
                  setStatus(f.value);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="filter-search-inline">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search recipient or subject…"
              aria-label="Search SMTP logs"
            />
            <button type="submit" className="btn-primary-sm">Search</button>
          </form>
        </div>

        <div className="admin-table-panel full-width">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Error</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="cell-sub">No mail attempts match this view.</td></tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.to_email}</strong></td>
                      <td>{row.subject}</td>
                      <td><span className="sa-log-kind">{row.kind}</span></td>
                      <td><LogPill status={row.status} /></td>
                      <td><small className="cell-sub">{row.error || '—'}</small></td>
                      <td>{new Date(row.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pager page={page} pages={pages} onPage={setPage} />
        </div>
      </ConsoleSection>
    </div>
  );
};
