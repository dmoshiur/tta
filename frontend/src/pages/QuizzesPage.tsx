import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { quizApi } from '../api.ts';
import type { QuizSummary } from '../types/index.ts';
import { QuizCard } from '../components/QuizCard.tsx';
import { LoadingState, EmptyState, ErrorState } from '../components/States.tsx';

export const QuizzesPage: React.FC = () => {
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

  return (
    <div className="page-container quizzes-catalog-page">
      <header className="page-header">
        <p className="page-eyebrow">ASSESSMENT & MCQS</p>
        <h1 className="page-title">Quizzes & Model Tests</h1>
        <p className="page-lead">
          Test your preparation with timed examinations, negative marking simulations, question explanations, and detailed performance history.
        </p>

        {/* Filter Pills */}
        <div className="catalog-filters-bar">
          <div className="filter-group">
            <button
              className={`filter-pill ${!kindParam ? 'active' : ''}`}
              onClick={() => updateKind('')}
            >
              All Tests
            </button>
            <button
              className={`filter-pill ${kindParam === 'MODEL_TEST' ? 'active' : ''}`}
              onClick={() => updateKind('MODEL_TEST')}
            >
              Model Tests
            </button>
            <button
              className={`filter-pill ${kindParam === 'MCQ' ? 'active' : ''}`}
              onClick={() => updateKind('MCQ')}
            >
              MCQ Practice
            </button>
            <button
              className={`filter-pill ${kindParam === 'QUIZ' ? 'active' : ''}`}
              onClick={() => updateKind('QUIZ')}
            >
              Course Quizzes
            </button>
          </div>

          <form onSubmit={handleSearch} className="filter-search-inline">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tests…"
              aria-label="Search tests"
            />
            <button type="submit" className="btn-primary-sm">Search</button>
          </form>
        </div>
      </header>

      {loading ? (
        <LoadingState message="Loading quizzes and tests…" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      ) : quizzes.length === 0 ? (
        <EmptyState
          title="No quizzes match your filter"
          message="Try selecting another test category or clearing your search."
          actionText="View All Tests"
          onAction={() => { setSearchInput(''); setSearchParams(new URLSearchParams()); }}
        />
      ) : (
        <div className="cards-grid">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  );
};
