import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { learningApi, contentApi, quizApi } from '../api.ts';
import type { Course, ContentItem, QuizSummary, Category } from '../types/index.ts';
import { CourseCard } from '../components/CourseCard.tsx';
import { ContentCard } from '../components/ContentCard.tsx';
import { QuizCard } from '../components/QuizCard.tsx';
import { EmptyState, ErrorState, SkeletonGrid } from '../components/States.tsx';
import { Reveal, RevealGroup } from '../components/Reveal.tsx';
import { useI18n } from '../i18n/index.tsx';

interface SectionConfig {
  id: string;
  contentTypes?: string[];
  /** position within the seven-pillar index (books pillar lives at /books) */
  pillarNo: number;
}

const SECTION_MAP: Record<string, SectionConfig> = {
  'job-prep': { id: 'JOB_PREP', pillarNo: 1 },
  academic: { id: 'ACADEMIC', pillarNo: 2 },
  knowledge: { id: 'KNOWLEDGE', contentTypes: ['KNOWLEDGE'], pillarNo: 4 },
  world: { id: 'WORLD', contentTypes: ['WORLD'], pillarNo: 5 },
  humanity: { id: 'HUMANITY', contentTypes: ['HUMANITY'], pillarNo: 6 },
  society: { id: 'SOCIETY', contentTypes: ['SOCIETY'], pillarNo: 7 },
};

export const SectionPage: React.FC<{ sectionSlug: string }> = ({ sectionSlug }) => {
  const { t } = useI18n();
  const config = SECTION_MAP[sectionSlug] || { id: 'GENERAL', pillarNo: 0 };

  const eyebrow = t(`hubs.${sectionSlug}.eyebrow`);
  const tagline = t(`hubs.${sectionSlug}.tagline`);
  const description = t(`hubs.${sectionSlug}.desc`);

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const activeTab = searchParams.get('tab') || 'all';

  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      learningApi.getCategories(config.id),
      learningApi.getCourses({ section: config.id, category: categoryParam, limit: 12 }),
      contentApi.getContentList({
        type: config.contentTypes ? config.contentTypes.join(',') : 'ALL',
        category: categoryParam,
        limit: 12,
      }),
      quizApi.getQuizzes({ category: categoryParam, limit: 12 }),
    ])
      .then(([cats, courseRes, contentRes, quizRes]) => {
        setCategories(cats);
        setCourses(courseRes.items);
        setContent(contentRes.items);
        setQuizzes(quizRes.items);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load section content.');
        setLoading(false);
      });
  }, [config.id, categoryParam]);

  const setCategory = (slug: string) => {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set('category', slug);
    else next.delete('category');
    setSearchParams(next);
  };

  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  const totalPieces = courses.length + quizzes.length + content.length;

  return (
    <div className="section-hub-page">
      {/* Editorial hub hero */}
      <header className="section-hub-header">
        <div className="section-hub-inner">
          {config.pillarNo > 0 && (
            <span className="section-hub-index" aria-hidden="true">
              {String(config.pillarNo).padStart(2, '0')}
            </span>
          )}
          <Reveal direction="up">
            <p className="section-hub-eyebrow">{eyebrow}</p>
          </Reveal>
          <Reveal direction="up" delay={90}>
            <h1 className="section-hub-title">{tagline}</h1>
          </Reveal>
          <Reveal direction="up" delay={180}>
            <p className="section-hub-lead">{description}</p>
          </Reveal>
          {!loading && totalPieces > 0 && (
            <Reveal direction="up" delay={260}>
              <div className="section-hub-meta-row">
                {courses.length > 0 && (
                  <span>
                    <i>{courses.length}</i> {t('sectionPage.courses')}
                  </span>
                )}
                {quizzes.length > 0 && (
                  <span>
                    <i>{quizzes.length}</i> {t('sectionPage.quizzesTab')}
                  </span>
                )}
                {content.length > 0 && (
                  <span>
                    <i>{content.length}</i> {t('sectionPage.articlesTab')}
                  </span>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </header>

      {/* Subcategory Pills */}
      {categories.length > 0 && (
        <div className="categories-pill-bar">
          <button className={`cat-pill ${!categoryParam ? 'active' : ''}`} onClick={() => setCategory('')}>
            {t('sectionPage.allTopics')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`cat-pill ${categoryParam === cat.slug ? 'active' : ''}`}
              onClick={() => setCategory(cat.slug)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* View Tabs */}
      <div className="section-view-tabs" role="tablist">
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')} role="tab" aria-selected={activeTab === 'all'}>
          {t('sectionPage.everything')}
        </button>
        {courses.length > 0 && (
          <button className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setTab('courses')} role="tab" aria-selected={activeTab === 'courses'}>
            {t('sectionPage.courses')} ({courses.length})
          </button>
        )}
        {quizzes.length > 0 && (
          <button className={`tab-btn ${activeTab === 'quizzes' ? 'active' : ''}`} onClick={() => setTab('quizzes')} role="tab" aria-selected={activeTab === 'quizzes'}>
            {t('sectionPage.quizzesTab')} ({quizzes.length})
          </button>
        )}
        {content.length > 0 && (
          <button className={`tab-btn ${activeTab === 'articles' ? 'active' : ''}`} onClick={() => setTab('articles')} role="tab" aria-selected={activeTab === 'articles'}>
            {t('sectionPage.articlesTab')} ({content.length})
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ paddingTop: '2.5rem' }}>
          <SkeletonGrid count={6} />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      ) : (
        <div className="section-content-body">
          {/* Courses Block */}
          {(activeTab === 'all' || activeTab === 'courses') && courses.length > 0 && (
            <div className="section-subblock">
              <div className="subblock-header">
                <h2>{t('sectionPage.structuredCourses')}</h2>
                <Link to={`/courses?section=${config.id}`}>{t('sectionPage.viewAllCourses')} →</Link>
              </div>
              <div className="cards-grid">
                <RevealGroup direction="up" stagger={90}>
                  {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </RevealGroup>
              </div>
            </div>
          )}

          {/* Quizzes & Tests Block */}
          {(activeTab === 'all' || activeTab === 'quizzes') && quizzes.length > 0 && (
            <div className="section-subblock">
              <div className="subblock-header">
                <h2>{t('sectionPage.practiceQuizzes')}</h2>
                <Link to="/quizzes">{t('sectionPage.viewAllTests')} →</Link>
              </div>
              <div className="cards-grid">
                <RevealGroup direction="up" stagger={90}>
                  {quizzes.map((quiz) => (
                    <QuizCard key={quiz.id} quiz={quiz} />
                  ))}
                </RevealGroup>
              </div>
            </div>
          )}

          {/* Articles & Essays Block */}
          {(activeTab === 'all' || activeTab === 'articles') && content.length > 0 && (
            <div className="section-subblock">
              <div className="subblock-header">
                <h2>{t('sectionPage.editorial')}</h2>
                <Link to="/articles">{t('sectionPage.viewAllArticles')} →</Link>
              </div>
              <div className="cards-grid">
                <RevealGroup direction="up" stagger={90}>
                  {content.map((item) => (
                    <ContentCard key={item.id} item={item} />
                  ))}
                </RevealGroup>
              </div>
            </div>
          )}

          {courses.length === 0 && quizzes.length === 0 && content.length === 0 && (
            <EmptyState
              title={t('sectionPage.emptyTitle')}
              message={t('sectionPage.emptyBody')}
              actionText={t('sectionPage.emptyAction')}
              onAction={() => setCategory('')}
            />
          )}
        </div>
      )}
    </div>
  );
};
