import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { learningApi } from '../api.ts';
import type { Course, Category } from '../types/index.ts';
import { CourseCard } from '../components/CourseCard.tsx';
import { LoadingState, EmptyState, ErrorState } from '../components/States.tsx';

export const CoursesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const sectionParam = searchParams.get('section') || '';
  const difficultyParam = searchParams.get('difficulty') || '';
  const categoryParam = searchParams.get('category') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    next.set('page', '1');
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
        <p className="page-eyebrow">STRUCTURED LEARNING</p>
        <h1 className="page-title">Explore Courses</h1>
        <p className="page-lead">
          Comprehensive, multi-module learning paths with notes, assignments, and quizzes.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="catalog-search-form">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search courses by title, topic, or instructor…"
            aria-label="Search courses"
            className="catalog-search-input"
          />
          <button type="submit" className="btn-primary search-btn">
            Search
          </button>
        </form>
      </header>

      {/* Filter controls */}
      <div className="catalog-filters-bar">
        <div className="filter-group">
          <span className="filter-label">Section:</span>
          <button
            className={`filter-pill ${!sectionParam ? 'active' : ''}`}
            onClick={() => updateFilter('section', '')}
          >
            All
          </button>
          <button
            className={`filter-pill ${sectionParam === 'JOB_PREP' ? 'active' : ''}`}
            onClick={() => updateFilter('section', 'JOB_PREP')}
          >
            Job Prep
          </button>
          <button
            className={`filter-pill ${sectionParam === 'ACADEMIC' ? 'active' : ''}`}
            onClick={() => updateFilter('section', 'ACADEMIC')}
          >
            Academic
          </button>
          <button
            className={`filter-pill ${sectionParam === 'WORLD' ? 'active' : ''}`}
            onClick={() => updateFilter('section', 'WORLD')}
          >
            World Affairs
          </button>
          <button
            className={`filter-pill ${sectionParam === 'KNOWLEDGE' ? 'active' : ''}`}
            onClick={() => updateFilter('section', 'KNOWLEDGE')}
          >
            General Knowledge
          </button>
          <button
            className={`filter-pill ${sectionParam === 'HUMANITY' ? 'active' : ''}`}
            onClick={() => updateFilter('section', 'HUMANITY')}
          >
            Humanity
          </button>
        </div>

        <div className="filter-group">
          <span className="filter-label">Difficulty:</span>
          <select
            value={difficultyParam}
            onChange={(e) => updateFilter('difficulty', e.target.value)}
            className="filter-select"
            aria-label="Filter by difficulty"
          >
            <option value="">All Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>

        {(qParam || sectionParam || difficultyParam || categoryParam) && (
          <button onClick={clearFilters} className="clear-filters-btn">
            Reset Filters ✕
          </button>
        )}
      </div>

      {/* Results header */}
      <div className="catalog-status-row">
        <span>Showing {courses.length} of {totalCount} courses</span>
      </div>

      {/* Course Cards Grid */}
      {loading ? (
        <LoadingState message="Fetching courses…" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      ) : courses.length === 0 ? (
        <EmptyState
          title="No courses match your criteria"
          message="Try broadening your search term or clearing the active filters."
          actionText="Clear All Filters"
          onAction={clearFilters}
        />
      ) : (
        <div className="cards-grid">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="pagination-nav" aria-label="Course pages">
          <button
            disabled={pageParam <= 1}
            onClick={() => updateFilter('page', String(pageParam - 1))}
            className="pagination-btn"
          >
            ← Previous
          </button>
          <span className="pagination-info">
            Page {pageParam} of {totalPages}
          </span>
          <button
            disabled={pageParam >= totalPages}
            onClick={() => updateFilter('page', String(pageParam + 1))}
            className="pagination-btn"
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  );
};
