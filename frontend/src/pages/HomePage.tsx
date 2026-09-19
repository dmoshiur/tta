import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { learningApi } from '../api.ts';
import { CourseCard } from '../components/CourseCard.tsx';
import { ContentCard } from '../components/ContentCard.tsx';
import { BookCard } from '../components/BookCard.tsx';
import { QuizCard } from '../components/QuizCard.tsx';
import { LoadingState, ErrorState } from '../components/States.tsx';

export const HomePage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    learningApi
      .getHome()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load homepage.');
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingState message="Loading ThinkTank Academia…" />;
  if (error || !data) return <ErrorState error={error || 'Failed to load content.'} onRetry={() => window.location.reload()} />;

  const { settings, stats, sections } = data;
  const hero = settings?.homepage || {};

  return (
    <div className="home-container">
      {/* ── HERO SECTION ── */}
      <section className="hero-section">
        <div className="hero-inner">
          <div className="hero-content">
            <p className="hero-eyebrow">{hero.heroEyebrow || 'MULTIDISCIPLINARY LEARNING & KNOWLEDGE'}</p>
            <h1 className="hero-title">
              {hero.heroTitle || 'Learn. Think.'}
              <br />
              <em className="hero-accent">{hero.heroTitleAccent || 'Understand. Unite.'}</em>
            </h1>
            <p className="hero-description">
              {hero.heroText || 'A multidisciplinary learning and knowledge platform for education, ideas, and humanity.'}
            </p>

            <div className="hero-actions">
              <Link to={hero.primaryCta?.href || '/courses'} className="btn-primary hero-btn">
                {hero.primaryCta?.label || 'Start Learning'} →
              </Link>
              <Link to={hero.secondaryCta?.href || '/knowledge'} className="btn-secondary hero-btn">
                {hero.secondaryCta?.label || 'Explore Knowledge'}
              </Link>
            </div>

            {/* Quick stats pills */}
            <div className="hero-stats-row">
              <div className="stat-pill">
                <strong>{stats?.courses || 8}</strong>
                <span>Courses</span>
              </div>
              <div className="stat-pill">
                <strong>{stats?.quizzes || 7}</strong>
                <span>Quizzes & Tests</span>
              </div>
              <div className="stat-pill">
                <strong>{stats?.books || 4}</strong>
                <span>Books</span>
              </div>
              <div className="stat-pill">
                <strong>{stats?.categories || 65}</strong>
                <span>Categories</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-orb">
              <span className="orb-initials">TT</span>
            </div>
            {hero.quote?.text && (
              <blockquote className="hero-quote">
                “{hero.quote.text}”
                <small>— {hero.quote.attribution || 'Albert Einstein'}</small>
              </blockquote>
            )}
          </div>
        </div>
      </section>

      {/* ── SECTION 1: SECTIONS ECOSYSTEM GRID ── */}
      <section className="home-section ecosystem-section">
        <div className="section-header">
          <p className="section-eyebrow">SEVEN PILLARS OF KNOWLEDGE</p>
          <h2 className="section-title">One Platform for Complete Learning</h2>
          <p className="section-subtitle">
            From competitive recruitment and academic mastery to deep philosophy, geopolitics, and human compassion.
          </p>
        </div>

        <div className="ecosystem-grid">
          {sections?.map((sec: any, idx: number) => (
            <Link to={sec.path} key={sec.id} className="ecosystem-card">
              <span className="eco-number">{String(idx + 1).padStart(2, '0')}</span>
              <h3 className="eco-title">{sec.tagline}</h3>
              <p className="eco-desc">{sec.description}</p>
              <span className="eco-action">Explore {sec.tagline} →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── SECTION 2: FEATURED COURSES ── */}
      {data.featured_courses?.length > 0 && (
        <section className="home-section cream-bg">
          <div className="section-header split-header">
            <div>
              <p className="section-eyebrow">CURATED LMS PATHWAYS</p>
              <h2 className="section-title">Featured Courses</h2>
            </div>
            <Link to="/courses" className="view-all-link">
              View All Courses ({stats?.courses || ''}) →
            </Link>
          </div>

          <div className="cards-grid">
            {data.featured_courses.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 3: JOB PREPARATION ── */}
      {data.job_prep_courses?.length > 0 && (
        <section className="home-section">
          <div className="section-header split-header">
            <div>
              <p className="section-eyebrow">CAREER & EXAM SUCCESS</p>
              <h2 className="section-title">ThinkTank Job Preparation</h2>
              <p className="section-subtitle">
                Systematic question analysis, General Knowledge recall drills, English grammar, Mathematics shortcuts, and timed tests.
              </p>
            </div>
            <Link to="/job-prep" className="view-all-link">
              Explore Job Prep Hub →
            </Link>
          </div>

          <div className="cards-grid">
            {data.job_prep_courses.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 4: ACADEMIC LEARNING ── */}
      {data.academic_courses?.length > 0 && (
        <section className="home-section cream-bg">
          <div className="section-header split-header">
            <div>
              <p className="section-eyebrow">CONCEPTUAL RIGOR</p>
              <h2 className="section-title">ThinkTank Academic</h2>
              <p className="section-subtitle">
                Clear concept explanations, problem-solving methods, and evidence-based study techniques.
              </p>
            </div>
            <Link to="/academic" className="view-all-link">
              Explore Academic Hub →
            </Link>
          </div>

          <div className="cards-grid">
            {data.academic_courses.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 5: BOOKS & IDEAS ── */}
      {data.books?.length > 0 && (
        <section className="home-section">
          <div className="section-header split-header">
            <div>
              <p className="section-eyebrow">DEEP READINGS</p>
              <h2 className="section-title">Books & Key Ideas</h2>
              <p className="section-subtitle">
                Condensations that respect the nuance. Key ideas, context, practical applications, and critical reviews.
              </p>
            </div>
            <Link to="/books" className="view-all-link">
              Explore All Books ({stats?.books || ''}) →
            </Link>
          </div>

          <div className="cards-grid books-grid">
            {data.books.map((book: any) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 6: GENERAL KNOWLEDGE & SCIENCE ── */}
      {data.knowledge?.length > 0 && (
        <section className="home-section cream-bg">
          <div className="section-header split-header">
            <div>
              <p className="section-eyebrow">SCIENCE, HISTORY & MIND</p>
              <h2 className="section-title">General Knowledge</h2>
              <p className="section-subtitle">
                Understanding how the world works: empirical science, cognitive psychology, economics, and history.
              </p>
            </div>
            <Link to="/knowledge" className="view-all-link">
              Explore General Knowledge →
            </Link>
          </div>

          <div className="cards-grid">
            {data.knowledge.map((item: any) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 7: WORLD AFFAIRS & GEOPOLITICS ── */}
      {data.world?.length > 0 && (
        <section className="home-section">
          <div className="section-header split-header">
            <div>
              <p className="section-eyebrow">GLOBAL PERSPECTIVES</p>
              <h2 className="section-title">World Affairs & Geopolitics</h2>
              <p className="section-subtitle">
                International relations, trade chokepoints, and alliances. Clearly separating <strong>Facts, Analysis, and Opinion</strong> with source citations.
              </p>
            </div>
            <Link to="/world" className="view-all-link">
              Explore World Affairs →
            </Link>
          </div>

          <div className="cards-grid">
            {data.world.map((item: any) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 8: HUMANITY & ETHICS ── */}
      {data.humanity?.length > 0 && (
        <section className="home-section cream-bg">
          <div className="section-header split-header">
            <div>
              <p className="section-eyebrow">DIGNITY & COMPASSION</p>
              <h2 className="section-title">ThinkTank Humanity</h2>
              <p className="section-subtitle">
                Exploring human dignity, empathy as an active discipline, ethics, and moral courage.
              </p>
            </div>
            <Link to="/humanity" className="view-all-link">
              Explore Humanity →
            </Link>
          </div>

          <div className="cards-grid">
            {data.humanity.map((item: any) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 9: SOCIAL UNITY & COHESION ── */}
      {data.society?.length > 0 && (
        <section className="home-section">
          <div className="section-header split-header">
            <div>
              <p className="section-eyebrow">CIVIC RESPONSIBILITY</p>
              <h2 className="section-title">Society & Social Unity</h2>
              <p className="section-subtitle">
                Dialogue across deep difference, mutual respect, diversity as a strength, and responsible citizenship.
              </p>
            </div>
            <Link to="/society" className="view-all-link">
              Explore Society & Unity →
            </Link>
          </div>

          <div className="cards-grid">
            {data.society.map((item: any) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 10: QUIZZES & MODEL TESTS ── */}
      {data.quizzes?.length > 0 && (
        <section className="home-section cream-bg">
          <div className="section-header split-header">
            <div>
              <p className="section-eyebrow">TIMED ASSESSMENT & MCQS</p>
              <h2 className="section-title">Latest Quizzes & Model Tests</h2>
              <p className="section-subtitle">
                Test your knowledge under real exam conditions with negative marking, time countdowns, and instant explanation reviews.
              </p>
            </div>
            <Link to="/quizzes" className="view-all-link">
              View All Quizzes ({stats?.quizzes || ''}) →
            </Link>
          </div>

          <div className="cards-grid">
            {data.quizzes.map((quiz: any) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 11: POPULAR COURSES ── */}
      {data.popular_courses?.length > 0 && (
        <section className="home-section">
          <div className="section-header">
            <p className="section-eyebrow">TRENDING AMONG LEARNERS</p>
            <h2 className="section-title">Popular Courses</h2>
          </div>

          <div className="cards-grid">
            {data.popular_courses.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 12: CORE PRINCIPLES ── */}
      <section className="home-section navy-bg">
        <div className="section-header light">
          <p className="section-eyebrow gold">ACADEMIC STANDARDS</p>
          <h2 className="section-title white">Knowledge With Context, Care, and Intellectual Honesty</h2>
        </div>

        <div className="principles-grid">
          <div className="principle-card">
            <strong className="principle-number">01</strong>
            <h3>Evidence Before Assertion</h3>
            <p>
              We ground claims in empirical evidence, historical context, and primary sources. Scepticism and rigor come first.
            </p>
          </div>

          <div className="principle-card">
            <strong className="principle-number">02</strong>
            <h3>Diverse Perspectives</h3>
            <p>
              Complex societal and geopolitical questions are presented through multiple valid angles without dogmatic polarization.
            </p>
          </div>

          <div className="principle-card">
            <strong className="principle-number">03</strong>
            <h3>Humanity at the Center</h3>
            <p>
              Knowledge is in service of human flourishing, empathy, mutual respect, and peaceful coexistence across communities.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 13: CALL TO ACTION ── */}
      <section className="home-section cta-banner-section">
        <div className="cta-banner">
          <h2>Begin Your Intellectual Journey Today</h2>
          <p>
            Join thousands of students, job seekers, and lifelong thinkers building structured knowledge across disciplines.
          </p>
          <div className="cta-actions">
            <Link to="/register" className="btn-primary">
              Create Free Account →
            </Link>
            <Link to="/courses" className="btn-secondary">
              Browse Course Catalog
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
