import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { contentApi } from '../api.ts';
import type { ContentItem } from '../types/index.ts';
import { ContentCard } from '../components/ContentCard.tsx';
import { LoadingState, EmptyState, ErrorState } from '../components/States.tsx';
import { RevealGroup } from '../components/Reveal.tsx';
import { useI18n } from '../i18n/index.tsx';

export const ArticlesPage: React.FC = () => {
  const { t } = useI18n();
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

  const typeFilters: { id: string; labelKey: string }[] = [
    { id: '', labelKey: 'articlesPage.allSections' },
    { id: 'KNOWLEDGE', labelKey: 'home.pillars.knowledge.name' },
    { id: 'WORLD', labelKey: 'home.pillars.world.name' },
    { id: 'HUMANITY', labelKey: 'home.pillars.humanity.name' },
    { id: 'SOCIETY', labelKey: 'home.pillars.society.name' },
    { id: 'ARTICLE', labelKey: 'articlesPage.essays' },
  ];

  return (
    <div className="page-container articles-catalog-page">
      <header className="page-header">
        <p className="page-eyebrow">{t('articlesPage.eyebrow')}</p>
        <h1 className="page-title">{t('articlesPage.title')}</h1>
        <p className="page-lead">{t('articlesPage.lead')}</p>

        {/* Filter Bar */}
        <div className="catalog-filters-bar">
          <div className="filter-group">
            {typeFilters.map((f) => (
              <button
                key={f.id || 'all'}
                className={`filter-pill ${typeParam === f.id ? 'active' : ''}`}
                onClick={() => updateFilter('type', f.id)}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <select
              value={stanceParam}
              onChange={(e) => updateFilter('stance', e.target.value)}
              className="filter-select"
              aria-label={t('articlesPage.stanceLabel')}
            >
              <option value="">{t('articlesPage.allStances')}</option>
              <option value="FACT">{t('articlesPage.stanceFact')}</option>
              <option value="ANALYSIS">{t('articlesPage.stanceAnalysis')}</option>
              <option value="OPINION">{t('articlesPage.stanceOpinion')}</option>
            </select>
          </div>

          <form onSubmit={handleSearch} className="filter-search-inline">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('articlesPage.searchPlaceholder')}
              aria-label={t('articlesPage.searchAria')}
            />
            <button type="submit" className="btn-primary-sm">{t('articlesPage.searchBtn')}</button>
          </form>
        </div>
      </header>

      {loading ? (
        <LoadingState message={t('articlesPage.loading')} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('articlesPage.emptyTitle')}
          message={t('articlesPage.emptyBody')}
          actionText={t('articlesPage.reset')}
          onAction={() => { setSearchInput(''); setSearchParams(new URLSearchParams()); }}
        />
      ) : (
        <div className="cards-grid">
          <RevealGroup direction="up" stagger={90}>
            {items.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </RevealGroup>
        </div>
      )}
    </div>
  );
};
