import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api.ts';
import { LoadingState, ErrorState } from '../../components/States.tsx';
import { ConsoleHeader, ConsoleSection, LogPill, MetricCard, Pager, formatDuration } from '../../components/admin/AdminBits.tsx';

/* API & Error Logs — request_log analytics for the Super Admin console. */

const VIEWS = [
  { value: 'all', label: 'All Traffic' },
  { value: 'errors', label: 'Errors (4xx/5xx)' },
  { value: 'server', label: 'Server Errors (5xx)' },
  { value: 'slow', label: 'Slow (> 800ms)' },
];

export const AdminApiLogsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [slowest, setSlowest] = useState<any[]>([]);
  const [topErrors, setTopErrors] = useState<any[]>([]);
  const [view, setView] = useState('all');
  const [term, setTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = { page, limit: 20, view };
    if (term) params.q = term;
    adminApi
      .getApiLogs(params)
      .then((res) => {
        setItems(res.items);
        setStats(res.stats);
        setBuckets(res.status_buckets_24h || []);
        setSlowest(res.slowest_endpoints_24h || []);
        setTopErrors(res.top_server_errors_7d || []);
        setPages(res.pages);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load API logs.');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, [page, view, term]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setTerm(searchInput.trim());
  };

  if (loading && items.length === 0 && !error && !stats) return <LoadingState message="Loading API & error logs…" />;
  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="page-container admin-hub-page">
      <ConsoleHeader
        title="API & Error Logs"
        desc="Every HTTP request the platform serves — traffic volumes, status codes, latency and failure hotspots."
      />

      {stats && (
        <div className="sa-metrics-grid">
          <MetricCard label="Requests (24h)" value={stats.last_24h.toLocaleString()} hint={`${stats.last_hour} in the last hour`} tone="info" />
          <MetricCard
            label="Errors (24h)"
            value={stats.errors_24h.toLocaleString()}
            tone={stats.errors_24h === 0 ? 'good' : 'warn'}
            hint={`incl. ${stats.server_24h} server errors`}
          />
          <MetricCard label="Avg Response" value={formatDuration(stats.avg_ms)} hint={`peak ${formatDuration(stats.max_ms)}`} />
          <MetricCard label="Log Retention" value={`${stats.retention_days} days`} hint="Traffic log window" />
        </div>
      )}

      <div className="admin-tables-row">
        {/* Status buckets */}
        <div className="admin-table-panel full-width">
          <div className="panel-header">
            <h3>Status Distribution (24h)</h3>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Requests</th>
                </tr>
              </thead>
              <tbody>
                {buckets.length === 0 ? (
                  <tr><td colSpan={2} className="cell-sub">No traffic recorded yet.</td></tr>
                ) : (
                  buckets.map((b) => (
                    <tr key={b.bucket}>
                      <td><LogPill status={b.bucket === '2xx' ? 200 : b.bucket === '3xx' ? 302 : b.bucket === '4xx' ? 404 : 500} /> <strong>{b.bucket}</strong></td>
                      <td>{b.total.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slowest endpoints */}
        <div className="admin-table-panel full-width">
          <div className="panel-header">
            <h3>Slowest Endpoints (24h)</h3>
            <span className="panel-tag">min 3 requests</span>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Hits</th>
                  <th>Avg</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                {slowest.length === 0 ? (
                  <tr><td colSpan={4} className="cell-sub">Not enough traffic yet.</td></tr>
                ) : (
                  slowest.map((row) => (
                    <tr key={row.path}>
                      <td><code>{row.path}</code></td>
                      <td>{row.total}</td>
                      <td>{formatDuration(row.avg_ms)}</td>
                      <td>{formatDuration(row.max_ms)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConsoleSection title="Request Log" tag={topErrors.length > 0 ? `${topErrors.length} error hotspots (7d)` : undefined}>
        <div className="catalog-filters-bar">
          <div className="sa-filter-tabs" role="tablist">
            {VIEWS.map((v) => (
              <button
                key={v.value}
                className={`sa-filter-tab${view === v.value ? ' active' : ''}`}
                onClick={() => {
                  setPage(1);
                  setView(v.value);
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="filter-search-inline">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filter by path or IP…"
              aria-label="Filter request log"
            />
            <button type="submit" className="btn-primary-sm">Filter</button>
          </form>
        </div>

        <div className="admin-table-panel full-width">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Kind</th>
                  <th>IP</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={7} className="cell-sub">No requests match this view.</td></tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id}>
                      <td><span className="sa-method-tag">{row.method}</span></td>
                      <td><code>{row.path}</code></td>
                      <td><LogPill status={row.status} /></td>
                      <td>{formatDuration(row.duration_ms)}</td>
                      <td>{row.is_api ? 'API' : 'Page'}</td>
                      <td><small className="cell-sub">{row.ip || '—'}</small></td>
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
