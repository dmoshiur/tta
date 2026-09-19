import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { learningApi, contentApi, quizApi } from '../api.ts';
import type { Course, ContentItem, QuizSummary, Category } from '../types/index.ts';
import { CourseCard } from '../components/CourseCard.tsx';
import { ContentCard } from '../components/ContentCard.tsx';
import { QuizCard } from '../components/QuizCard.tsx';
import { LoadingState, EmptyState, ErrorState } from '../components/States.tsx';

interface SectionConfig {
  id: string;
  tagline: string;
  eyebrow: string;
  description: string;
  contentTypes?: string[];
  bannerBg?: string;
}

const SECTION_MAP: Record<string, SectionConfig> = {
  'job-prep': {
    id: 'JOB_PREP',
    tagline: 'ThinkTank Job Preparation',
    eyebrow: 'CAREER & COMPETITIVE EXAMINATIONS',
    description:
      'MCQ question banks, full-length model tests, previous questions analysis, General Knowledge, Current Affairs, English, বাংলা, Mathematics, ICT, and proven exam strategy.',
  },
  academic: {
    id: 'ACADEMIC',
    tagline: 'ThinkTank Academic',
    eyebrow: 'FOUNDATIONS & TUTORIALS',
    description:
      'Step-by-step concept explanations, guided tutorials, worked problem solving, exam preparation notes, and curated academic study resources.',
  },
  knowledge: {
    id: 'KNOWLEDGE',
    tagline: 'General Knowledge & Science',
    eyebrow: 'EXPANDING YOUR MENTAL HORIZON',
    description:
      'History, natural sciences, technology, economics, psychology, philosophy, world culture, environment, and everyday knowledge explained with context.',
    contentTypes: ['KNOWLEDGE'],
  },
  world: {
    id: 'WORLD',
    tagline: 'World Affairs & Geopolitics',
    eyebrow: 'GLOBAL STRATEGY & INTERNATIONAL RELATIONS',
    description:
      'International relations, geopolitics, trade chokepoints, diplomacy, major powers, and current events. Strictly distinguishing Facts, Analysis, and Opinion with sources.',
    contentTypes: ['WORLD'],
  },
  humanity: {
    id: 'HUMANITY',
    tagline: 'ThinkTank Humanity',
    eyebrow: 'ETHICS, DIGNITY & EMPATHY',
    description:
      'Empathy as an active discipline, unconditional human dignity, moral courage, kindness, social responsibility, and lived human testimony.',
    contentTypes: ['HUMANITY'],
  },
  society: {
    id: 'SOCIETY',
    tagline: 'Society & Social Unity',
    eyebrow: 'COHESION & RESPONSIBLE CITIZENSHIP',
    description:
      'Social cohesion, mutual respect across difference, constructive dialogue, tolerance, diversity, community values, and peaceful coexistence.',
    contentTypes: ['SOCIETY'],
  },
};

export const SectionPage: React.FC<{ sectionSlug: string }> = ({ sectionSlug }) => {
  const config = SECTION_MAP[sectionSlug] || {
    id: 'GENERAL',
    tagline: 'Knowledge Hub',
    eyebrow: 'LEARNING & IDEAS',
    description: 'Explore multidisciplinary learning materials.',
  };

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

  return (
    <div className="section-hub-page">
      {/* Section Hero Banner */}
      <header className="section-hub-header">
        <div className="section-hub-inner">
          <p className="section-hub-eyebrow">{config.eyebrow}</p>
          <h1 className="section-hub-title">{config.tagline}</h1>
          <p className="section-hub-lead">{config.description}</p>
        </div>
      </header>

      {/* Subcategory Pills */}
      {categories.length > 0 && (
        <div className="categories-pill-bar">
          <button
            className={`cat-pill ${!categoryParam ? 'active' : ''}`}
            onClick={() => setCategory('')}
          >
            All Topics
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
      <div className="section-view-tabs">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          Everything
        </button>
        {courses.length > 0 && (
          <button
            className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setTab('courses')}
          >
            Courses ({courses.length})
          </button>
        )}
        {quizzes.length > 0 && (
          <button
            className={`tab-btn ${activeTab === 'quizzes' ? 'active' : ''}`}
            onClick={() => setTab('quizzes')}
          >
            Quizzes & Tests ({quizzes.length})
          </button>
        )}
        {content.length > 0 && (
          <button
            className={`tab-btn ${activeTab === 'articles' ? 'active' : ''}`}
            onClick={() => setTab('articles')}
          >
            Articles & Pieces ({content.length})
          </button>
        )}
      </div>

      {loading ? (
        <LoadingState message={`Loading ${config.tagline}…`} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      ) : (
        <div className="section-content-body">
          {/* Courses Block */}
          {(activeTab === 'all' || activeTab === 'courses') && courses.length > 0 && (
            <div className="section-subblock">
              <div className="subblock-header">
                <h2>Structured Courses</h2>
                <Link to={`/courses?section=${config.id}`}>View all courses →</Link>
              </div>
              <div className="cards-grid">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          )}

          {/* Quizzes & Tests Block */}
          {(activeTab === 'all' || activeTab === 'quizzes') && quizzes.length > 0 && (
            <div className="section-subblock">
              <div className="subblock-header">
                <h2>Practice Quizzes & Model Tests</h2>
                <Link to="/quizzes">View all tests →</Link>
              </div>
              <div className="cards-grid">
                {quizzes.map((quiz) => (
                  <QuizCard key={quiz.id} quiz={quiz} />
                ))}
              </div>
            </div>
          )}

          {/* Articles & Essays Block */}
          {(activeTab === 'all' || activeTab === 'articles') && content.length > 0 && (
            <div className="section-subblock">
              <div className="subblock-header">
                <h2>Editorial Analyses & Perspectives</h2>
                <Link to="/articles">View all articles →</Link>
              </div>
              <div className="cards-grid">
                {content.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {courses.length === 0 && quizzes.length === 0 && content.length === 0 && (
            <EmptyState
              title="No content in this category yet"
              message="Select another subtopic or check back soon as our editorial team publishes new material."
              actionText="View All Topics"
              onAction={() => setCategory('')}
            />
          )}
        </div>
      )}
    </div>
  );
};
