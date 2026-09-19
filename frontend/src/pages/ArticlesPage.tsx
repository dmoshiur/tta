import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { contentApi } from '../api.ts';
import type { ContentItem } from '../types/index.ts';
import { ContentCard } from '../components/ContentCard.tsx';
import { LoadingState, EmptyState, ErrorState } from '../components/States.tsx';

export const ArticlesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') || '';
  const stanceParam = searchParams.get('stance') || '';

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(qParam);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { limit: 20 };
    if (qParam) params.q = qParam;
    if (typeParam) params.type = typeParam;
    if (stanceParam) params.stance = stanceParam;

    contentApi
      .getContentList(params)
      .then((res) => {
        setItems(res.items);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load articles.');
        setLoading(false);
      });
  }, [qParam, typeParam, stanceParam]);

  const updateFilter = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val);
    else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('q', searchInput.trim());
  };

  return (
    <div className="page-container articles-catalog-page">
      <header className="page-header">
        <p className="page-eyebrow">IDEAS & PERSPECTIVES</p>
        <h1 className="page-title">Editorial Articles & Analyses</h1>
        <p className="page-lead">
          Thoughtful, evidence-grounded articles on science, geopolitics, human empathy, and community coexistence.
        </p>

        {/* Filter Bar */}
        <div className="catalog-filters-bar">
          <div className="filter-group">
            <button
              className={`filter-pill ${!typeParam ? 'active' : ''}`}
              onClick={() => updateFilter('type', '')}
            >
              All Sections
            </button>
            <button
              className={`filter-pill ${typeParam === 'KNOWLEDGE' ? 'active' : ''}`}
              onClick={() => updateFilter('type', 'KNOWLEDGE')}
            >
              Knowledge
            </button>
            <button
              className={`filter-pill ${typeParam === 'WORLD' ? 'active' : ''}`}
              onClick={() => updateFilter('type', 'WORLD')}
            >
              World Affairs
            </button>
            <button
              className={`filter-pill ${typeParam === 'HUMANITY' ? 'active' : ''}`}
              onClick={() => updateFilter('type', 'HUMANITY')}
            >
              Humanity
            </button>
            <button
              className={`filter-pill ${typeParam === 'SOCIETY' ? 'active' : ''}`}
              onClick={() => updateFilter('type', 'SOCIETY')}
            >
              Society
            </button>
            <button
              className={`filter-pill ${typeParam === 'ARTICLE' ? 'active' : ''}`}
              onClick={() => updateFilter('type', 'ARTICLE')}
            >
              Essays
            </button>
          </div>

          <div className="filter-group">
            <select
              value={stanceParam}
              onChange={(e) => updateFilter('stance', e.target.value)}
              className="filter-select"
              aria-label="Filter by stance"
            >
              <option value="">All Stances</option>
              <option value="FACT">Fact (Report)</option>
              <option value="ANALYSIS">Analysis</option>
              <option value="OPINION">Opinion (Perspective)</option>
            </select>
          </div>

          <form onSubmit={handleSearch} className="filter-search-inline">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search articles…"
              aria-label="Search articles"
            />
            <button type="submit" className="btn-primary-sm">Search</button>
          </form>
        </div>
      </header>

      {loading ? (
        <LoadingState message="Loading editorial library…" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No articles match your criteria"
          message="Try adjusting your section or stance filters, or clear your search."
          actionText="Reset All Filters"
          onAction={() => { setSearchInput(''); setSearchParams(new URLSearchParams()); }}
        />
      ) : (
        <div className="cards-grid">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
