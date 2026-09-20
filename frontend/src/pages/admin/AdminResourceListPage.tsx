import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { LoadingState, EmptyState, ErrorState } from '../../components/States.tsx';

export const AdminResourceListPage: React.FC<{ fixedResource?: string }> = ({ fixedResource }) => {
  const routeParams = useParams<{ resource: string }>();
  const resource = fixedResource ?? routeParams.resource ?? '';
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [meta, setMeta] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState(qParam);
  const toast = useToast();

  // Load resource schema metadata
  useEffect(() => {
    adminApi.getResourcesMeta().then((resList) => {
      const found = resList.find((r) => r.key === resource);
      if (found) setMeta(found);
    }).catch(() => {});
  }, [resource]);

  const loadItems = () => {
    setLoading(true);
    const params: Record<string, any> = { page: pageParam, limit: 15 };
    if (qParam) params.q = qParam;

    // Apply any active filters
    meta?.filters?.forEach((f: any) => {
      const val = searchParams.get(f.key);
      if (val) params[f.key] = val;
    });

    adminApi
      .listResource(resource, params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.pages);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load records.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadItems();
  }, [resource, qParam, pageParam, meta]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) next.set('q', searchInput.trim());
    else next.delete('q');
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleTogglePublish = async (id: string) => {
    try {
      const res = await adminApi.togglePublish(resource, id);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: res.status } : item)),
      );
      toast.success(`Status updated to ${res.status}`);
    } catch (err: any) {
      toast.error(err.message || 'Toggle status failed');
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${label}"?`)) return;
    try {
      await adminApi.deleteResource(resource, id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => prev - 1);
      toast.info('Record deleted successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Deletion failed.');
    }
  };

  const listFields = meta?.fields?.filter((f: any) => f.list) || [{ key: 'title', label: 'Title' }];

  return (
    <div className="page-container admin-hub-page">
      <header className="admin-page-header">
        <div className="admin-header-title-wrap">
          <div className="admin-breadcrumbs">
            <Link to="/admin/dashboard">Super Admin</Link>
            <span>/</span>
            <span>{meta?.label || resource}</span>
          </div>
          <h1 className="admin-page-title">{meta?.label || resource}</h1>
          <p className="admin-page-desc">Create, review, edit, and publish {meta?.singular || 'record'} items.</p>
        </div>

        <div className="admin-quick-nav">
          <Link to={`/admin/r/${resource}/new`} className="btn-primary">
            + Create New {meta?.singular || 'Item'}
          </Link>
        </div>
      </header>

      {/* Filter & Search Bar */}
      <div className="catalog-filters-bar">
        <form onSubmit={handleSearchSubmit} className="filter-search-inline">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`Search ${meta?.label || 'records'}…`}
            aria-label="Search records"
          />
          <button type="submit" className="btn-primary-sm">Search</button>
        </form>

        <span className="admin-count-status">
          Total: <strong>{total}</strong> records
        </span>
      </div>

      {loading ? (
        <LoadingState message={`Fetching ${meta?.label || resource}…`} />
      ) : error ? (
        <ErrorState error={error} onRetry={loadItems} />
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${meta?.label || 'records'} found`}
          message="Create your first entry to populate this section."
          actionText={`+ Create ${meta?.singular || 'Item'}`}
          actionHref={`/admin/r/${resource}/new`}
        />
      ) : (
        <div className="admin-table-panel full-width">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  {listFields.map((f: any) => (
                    <th key={f.key}>{f.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    {listFields.map((f: any) => {
                      const val = row[f.key];
                      return (
                        <td key={f.key}>
                          {f.key === 'status' ? (
                            <span className={`status-pill pill-${String(val).toLowerCase()}`}>
                              {val}
                            </span>
                          ) : typeof val === 'boolean' ? (
                            <span>{val ? '✓ Yes' : '✕ No'}</span>
                          ) : typeof val === 'object' && val !== null ? (
                            <span>{JSON.stringify(val).slice(0, 30)}…</span>
                          ) : (
                            <strong>{String(val ?? '—')}</strong>
                          )}
                        </td>
                      );
                    })}

                    <td className="admin-actions-cell">
                      <Link to={`/admin/r/${resource}/${row.id}`} className="btn-table-action">
                        Edit
                      </Link>

                      {'status' in row && (
                        <button
                          onClick={() => handleTogglePublish(row.id)}
                          className="btn-table-action"
                          title="Toggle draft/publish"
                        >
                          {row.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(row.id, row.title || row.name || row.id)}
                        className="btn-danger-sm"
                        title="Delete record"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-nav">
              <button
                disabled={pageParam <= 1}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set('page', String(pageParam - 1));
                  setSearchParams(next);
                }}
                className="pagination-btn"
              >
                ← Prev
              </button>
              <span className="pagination-info">Page {pageParam} of {totalPages}</span>
              <button
                disabled={pageParam >= totalPages}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set('page', String(pageParam + 1));
                  setSearchParams(next);
                }}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
