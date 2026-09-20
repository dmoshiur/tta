import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { quizApi } from '../api.ts';
import type { QuizSummary } from '../types/index.ts';
import { QuizCard } from '../components/QuizCard.tsx';
import { LoadingState, EmptyState, ErrorState } from '../components/States.tsx';
import { RevealGroup } from '../components/Reveal.tsx';
import { useI18n } from '../i18n/index.tsx';

export const QuizzesPage: React.FC = () => {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const kindParam = searchParams.get('kind') || '';
  const qParam = searchParams.get('q') || '';

  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(qParam);

  useEffect(() => {
    setLoading(true);
    quizApi
      .getQuizzes({ kind: kindParam, q: qParam, limit: 20 })
      .then((res) => {
        setQuizzes(res.items);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load quizzes.');
        setLoading(false);
      });
  }, [kindParam, qParam]);

  const updateKind = (kind: string) => {
    const next = new URLSearchParams(searchParams);
    if (kind) next.set('kind', kind);
    else next.delete('kind');
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) next.set('q', searchInput.trim());
    else next.delete('q');
    setSearchParams(next);
  };

  const kindFilters: { id: string; labelKey: string }[] = [
    { id: '', labelKey: 'quizzesPage.all' },
    { id: 'MODEL_TEST', labelKey: 'quizzesPage.modelTests' },
    { id: 'MCQ', labelKey: 'quizzesPage.mcqPractice' },
    { id: 'QUIZ', labelKey: 'quizzesPage.courseQuizzes' },
  ];

  return (
    <div className="page-container quizzes-catalog-page">
      <header className="page-header">
        <p className="page-eyebrow">{t('quizzesPage.eyebrow')}</p>
        <h1 className="page-title">{t('quizzesPage.title')}</h1>
        <p className="page-lead">{t('quizzesPage.lead')}</p>

        {/* Filter Pills */}
        <div className="catalog-filters-bar">
          <div className="filter-group">
            {kindFilters.map((f) => (
              <button
                key={f.id || 'all'}
                className={`filter-pill ${kindParam === f.id ? 'active' : ''}`}
                onClick={() => updateKind(f.id)}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="filter-search-inline">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('quizzesPage.searchPlaceholder')}
              aria-label={t('quizzesPage.searchAria')}
            />
            <button type="submit" className="btn-primary-sm">{t('articlesPage.searchBtn')}</button>
          </form>
        </div>
      </header>

      {loading ? (
        <LoadingState message={t('quizzesPage.loading')} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      ) : quizzes.length === 0 ? (
        <EmptyState
          title={t('quizzesPage.emptyTitle')}
          message={t('quizzesPage.emptyBody')}
          actionText={t('quizzesPage.viewAll')}
          onAction={() => { setSearchInput(''); setSearchParams(new URLSearchParams()); }}
        />
      ) : (
        <div className="cards-grid">
          <RevealGroup direction="up" stagger={90}>
            {quizzes.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </RevealGroup>
        </div>
      )}
    </div>
  );
};
