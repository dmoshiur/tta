import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { learningApi } from '../api.ts';
import type { Course, Category } from '../types/index.ts';
import { CourseCard } from '../components/CourseCard.tsx';
import { LoadingState, EmptyState, ErrorState } from '../components/States.tsx';
import { RevealGroup } from '../components/Reveal.tsx';
import { useI18n } from '../i18n/index.tsx';

export const CoursesPage: React.FC = () => {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const sectionParam = searchParams.get('section') || '';
  const difficultyParam = searchParams.get('difficulty') || '';
  const categoryParam = searchParams.get('category') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [courses, setCourses] = useState<Course[]>([]);
  const [, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [searchInput, setSearchInput] = useState(qParam);

  useEffect(() => {
    learningApi.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page: pageParam, limit: 12 };
    if (qParam) params.q = qParam;
    if (sectionParam) params.section = sectionParam;
    if (difficultyParam) params.difficulty = difficultyParam;
    if (categoryParam) params.category = categoryParam;

    learningApi
      .getCourses(params)
      .then((res) => {
        setCourses(res.items);
        setTotalPages(res.pages);
        setTotalCount(res.total);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load courses.');
        setLoading(false);
      });
  }, [qParam, sectionParam, difficultyParam, categoryParam, pageParam]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('q', searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="page-container courses-page">
      <header className="page-header">
        <p className="page-eyebrow">{t('coursesPage.eyebrow')}</p>
        <h1 className="page-title">{t('coursesPage.title')}</h1>
        <p className="page-lead">{t('coursesPage.lead')}</p>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="catalog-search-form">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('coursesPage.searchPlaceholder')}
            aria-label={t('coursesPage.searchAria')}
            className="catalog-search-input"
          />
          <button type="submit" className="btn-primary search-btn">
            {t('nav.search')}
          </button>
        </form>
      </header>

      {/* Filter controls */}
      <div className="catalog-filters-bar">
        <div className="filter-group">
          <span className="filter-label">{t('coursesPage.section')}</span>
          <button
            className={`filter-pill ${!sectionParam ? 'active' : ''}`}
            onClick={() => updateFilter('section', '')}
          >
            {t('coursesPage.all')}
          </button>
          <button
            className={`filter-pill ${sectionParam === 'JOB_PREP' ? 'active' : ''}`}
            onClick={() => updateFilter('section', 'JOB_PREP')}
          >
            {t('home.pillars.jobPrep.name')}
          </button>
          <button
            className={`filter-pill ${sectionParam === 'ACADEMIC' ? 'active' : ''}`}
            onClick={() => updateFilter('section', 'ACADEMIC')}
          >
            {t('home.pillars.academic.name')}
          </button>
          <button
            className={`filter-pill ${sectionParam === 'WORLD' ? 'active' : ''}`}
            onClick={() => updateFilter('section', 'WORLD')}
          >
            {t('home.pillars.world.name')}
          </button>
          <button
            className={`filter-pill ${sectionParam === 'KNOWLEDGE' ? 'active' : ''}`}
            onClick={() => updateFilter('section', 'KNOWLEDGE')}
          >
            {t('home.pillars.knowledge.name')}
          </button>
          <button
            className={`filter-pill ${sectionParam === 'HUMANITY' ? 'active' : ''}`}
            onClick={() => updateFilter('section', 'HUMANITY')}
          >
            {t('home.pillars.humanity.name')}
          </button>
        </div>

        <div className="filter-group">
          <span className="filter-label">{t('coursesPage.difficulty')}</span>
          <select
            value={difficultyParam}
            onChange={(e) => updateFilter('difficulty', e.target.value)}
            className="filter-select"
            aria-label={t('coursesPage.difficulty')}
          >
            <option value="">{t('coursesPage.allLevels')}</option>
            <option value="BEGINNER">{t('coursesPage.beginner')}</option>
            <option value="INTERMEDIATE">{t('coursesPage.intermediate')}</option>
            <option value="ADVANCED">{t('coursesPage.advanced')}</option>
          </select>
        </div>

        {(qParam || sectionParam || difficultyParam || categoryParam) && (
          <button onClick={clearFilters} className="clear-filters-btn">
            {t('coursesPage.reset')} ✕
          </button>
        )}
      </div>

      {/* Results header */}
      <div className="catalog-status-row">
        <span>{t('coursesPage.showing', { count: courses.length, total: totalCount })}</span>
      </div>

      {/* Course Cards Grid */}
      {loading ? (
        <LoadingState message={t('coursesPage.loading')} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      ) : courses.length === 0 ? (
        <EmptyState
          title={t('coursesPage.emptyTitle')}
          message={t('coursesPage.emptyBody')}
          actionText={t('coursesPage.reset')}
          onAction={clearFilters}
        />
      ) : (
        <div className="cards-grid">
          <RevealGroup direction="up" stagger={100}>
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </RevealGroup>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="pagination-nav" aria-label={t('coursesPage.title') + ' — ' + t('coursesPage.pageOf', { page: pageParam, pages: totalPages })}>
          <button
            disabled={pageParam <= 1}
            onClick={() => updateFilter('page', String(pageParam - 1))}
            className="pagination-btn"
          >
            ← {t('coursesPage.prev')}
          </button>
          <span className="pagination-info">
            {t('coursesPage.pageOf', { page: pageParam, pages: totalPages })}
          </span>
          <button
            disabled={pageParam >= totalPages}
            onClick={() => updateFilter('page', String(pageParam + 1))}
            className="pagination-btn"
          >
            {t('coursesPage.next')} →
          </button>
        </nav>
      )}
    </div>
  );
};
