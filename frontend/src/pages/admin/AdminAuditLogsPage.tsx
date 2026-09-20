import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api.ts';
import { LoadingState, ErrorState } from '../../components/States.tsx';
import { ConsoleHeader, ConsoleSection, Pager } from '../../components/admin/AdminBits.tsx';

/* Audit Logs — the platform activity feed: who did what, to which entity, when. */

export const AdminAuditLogsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [filters, setFilters] = useState<{ actions: string[]; entity_types: string[] }>({ actions: [], entity_types: [] });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [term, setTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = { page, limit: 25 };
    if (action) params.action = action;
    if (entityType) params.entity_type = entityType;
    if (term) params.q = term;
    adminApi
      .getAuditLogs(params)
      .then((res) => {
        setItems(res.items);
        setFilters(res.filters || { actions: [], entity_types: [] });
        setPages(res.pages);
        setTotal(res.total);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load audit logs.');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, [page, action, entityType, term]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setTerm(searchInput.trim());
  };

  if (loading && items.length === 0 && !error) return <LoadingState message="Loading audit trail…" />;
  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="page-container admin-hub-page">
      <ConsoleHeader
        title="Audit Logs"
        desc="Immutable activity trail for the whole platform — administrative actions, content changes and authentication events."
      />

      <ConsoleSection title="Activity Trail" tag={`${total} events`}>
        <div className="catalog-filters-bar">
          <form onSubmit={handleSearch} className="filter-search-inline">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search actor, action or entity…"
              aria-label="Search audit logs"
            />
            <button type="submit" className="btn-primary-sm">Search</button>
          </form>

          <select
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value);
            }}
            className="admin-select-sm"
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            {filters.actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={entityType}
            onChange={(e) => {
              setPage(1);
              setEntityType(e.target.value);
            }}
            className="admin-select-sm"
            aria-label="Filter by entity type"
          >
            <option value="">All entities</option>
            {filters.entity_types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {(action || entityType || term) && (
            <button
              className="btn-table-action"
              onClick={() => {
                setAction('');
                setEntityType('');
                setTerm('');
                setSearchInput('');
                setPage(1);
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="admin-table-panel full-width">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Target</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="cell-sub">No audit events match this view.</td></tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.actor_name}</strong></td>
                      <td><span className="action-tag sa-audit-action">{row.action}</span></td>
                      <td>{row.entity_type || '—'}</td>
                      <td><small className="cell-sub">{row.entity_label || '—'}</small></td>
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
