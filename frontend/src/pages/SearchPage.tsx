import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { discoveryApi } from '../api.ts';
import { LoadingState, EmptyState } from '../components/States.tsx';
import { useI18n } from '../i18n/index.tsx';

export const SearchPage: React.FC = () => {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') || '';

  const [inputVal, setInputVal] = useState(qParam);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!qParam || qParam.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    discoveryApi
      .search(qParam, typeParam || undefined)
      .then((res) => {
        setResults(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [qParam, typeParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (inputVal.trim()) next.set('q', inputVal.trim());
    else next.delete('q');
    setSearchParams(next);
  };

  const updateType = (type: string) => {
    const next = new URLSearchParams(searchParams);
    if (type) next.set('type', type);
    else next.delete('type');
    setSearchParams(next);
  };

  return (
    <div className="page-container search-screen">
      <header className="page-header">
        <p className="page-eyebrow">{t('searchPage.eyebrow')}</p>
        <h1 className="page-title">{t('searchPage.title')}</h1>
        <p className="page-lead">{t('searchPage.lead')}</p>

        <form onSubmit={handleSearchSubmit} className="catalog-search-form">
          <input
            type="search"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={t('searchPage.examples')}
            aria-label={t('searchPage.title')}
            className="catalog-search-input"
            autoFocus
          />
          <button type="submit" className="btn-primary search-btn">
            {t('articlesPage.searchBtn')}
          </button>
        </form>

        {/* Filter Pills */}
        <div className="catalog-filters-bar">
          <button
            className={`filter-pill ${!typeParam ? 'active' : ''}`}
            onClick={() => updateType('')}
          >
            {t('searchPage.allResults')}
          </button>
          <button
            className={`filter-pill ${typeParam === 'course' ? 'active' : ''}`}
            onClick={() => updateType('course')}
          >
            {t('user.bookmarks.courses')} {results?.counts?.courses ? `(${results.counts.courses})` : ''}
          </button>
          <button
            className={`filter-pill ${typeParam === 'book' ? 'active' : ''}`}
            onClick={() => updateType('book')}
          >
            {t('user.bookmarks.books')} {results?.counts?.books ? `(${results.counts.books})` : ''}
          </button>
          <button
            className={`filter-pill ${typeParam === 'quiz' ? 'active' : ''}`}
            onClick={() => updateType('quiz')}
          >
            {t('user.bookmarks.quizzes')} {results?.counts?.quizzes ? `(${results.counts.quizzes})` : ''}
          </button>
          <button
            className={`filter-pill ${typeParam === 'lesson' ? 'active' : ''}`}
            onClick={() => updateType('lesson')}
          >
            {t('user.bookmarks.lessons')} {results?.counts?.lessons ? `(${results.counts.lessons})` : ''}
          </button>
        </div>
      </header>

      {loading ? (
        <LoadingState message={t('searchPage.searching')} />
      ) : !qParam ? (
        <div className="search-hint-box">
          <h3>{t('searchPage.trySearching')}</h3>
          <div className="search-tags-suggestions">
            {['Critical Thinking', 'General Knowledge', 'Economics', 'Geopolitics', 'Empathy', 'Constitution', 'Kahneman', 'Mathematics'].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setInputVal(term);
                  const next = new URLSearchParams();
                  next.set('q', term);
                  setSearchParams(next);
                }}
                className="search-suggest-chip"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      ) : results && results.results?.length === 0 ? (
        <EmptyState
          title={t('searchPage.noResults', { q: qParam })}
          message={t('searchPage.noResultsBody')}
          actionText={t('booksPage.clearSearch')}
          onAction={() => {
            setInputVal('');
            setSearchParams(new URLSearchParams());
          }}
        />
      ) : results ? (
        <div className="search-results-list">
          <p className="search-count-status" dangerouslySetInnerHTML={{ __html: t('searchPage.found', { total: results.total, q: qParam }) }} />

          <div className="search-items-stack">
            {results.results.map((item: any, idx: number) => (
              <div key={idx} className="search-result-row">
                <div className="res-meta-line">
                  <span className="res-type-badge">{item.result_type}</span>
                  {item.category && <span className="res-category">{item.category}</span>}
                  {item.author_name && <span className="res-author">{t('course.by')} {item.author_name}</span>}
                </div>

                <h3 className="res-title">
                  <Link to={item.href}>{item.title}</Link>
                </h3>

                {item.excerpt && <p className="res-excerpt">{item.excerpt}</p>}

                <Link to={item.href} className="res-open-link">
                  {t('searchPage.openType', { type: item.result_type.toLowerCase() })} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
