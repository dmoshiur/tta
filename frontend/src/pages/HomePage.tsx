import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { learningApi } from '../api.ts';
import { CourseCard } from '../components/CourseCard.tsx';
import { ContentCard } from '../components/ContentCard.tsx';
import { BookCard } from '../components/BookCard.tsx';
import { QuizCard } from '../components/QuizCard.tsx';
import { ErrorState, SkeletonHero, SkeletonGrid } from '../components/States.tsx';
import { Reveal, RevealGroup } from '../components/Reveal.tsx';
import { CountUp } from '../components/CountUp.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { IconArrowRight, IconArrowUpRight } from '../components/icons.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useI18n } from '../i18n/index.tsx';

/* ── The seven pillars: editorial index data ────────────────────────────── */
const PILLARS = [
  { id: 'JOB_PREP', path: '/job-prep', img: '/brand/pillars/job-prep.jpg', i18n: 'jobPrep' },
  { id: 'ACADEMIC', path: '/academic', img: '/brand/pillars/academic.jpg', i18n: 'academic' },
  { id: 'BOOKS', path: '/books', img: '/brand/pillars/books.jpg', i18n: 'books' },
  { id: 'KNOWLEDGE', path: '/knowledge', img: '/brand/pillars/knowledge.jpg', i18n: 'knowledge' },
  { id: 'WORLD', path: '/world', img: '/brand/pillars/world.jpg', i18n: 'world' },
  { id: 'HUMANITY', path: '/humanity', img: '/brand/pillars/humanity.jpg', i18n: 'humanity' },
  { id: 'SOCIETY', path: '/society', img: '/brand/pillars/society.jpg', i18n: 'society' },
] as const;

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [data, setData] = useState<any>(null);
  const [continueItems, setContinueItems] = useState<any[]>([]);
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

  // Authenticated visitors get their real continue-learning rail
  useEffect(() => {
    if (!user) {
      setContinueItems([]);
      return;
    }
    learningApi
      .getDashboard()
      .then((res) => setContinueItems((res.continue_learning || []).slice(0, 3)))
      .catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <div className="home-container">
        <SkeletonHero />
        <SkeletonGrid count={3} />
      </div>
    );
  }
  if (error || !data) return <ErrorState error={error || 'Failed to load content.'} onRetry={() => window.location.reload()} />;

  const { stats, sections } = data;
  const hero = data.settings?.homepage || {};
  const apiSectionById: Record<string, any> = {};
  (sections || []).forEach((s: any) => {
    apiSectionById[s.id] = s;
  });

  const spotlightItems = (data.knowledge || []).slice(0, 3);
  const spotlightLead = spotlightItems[0];

  return (
    <div className="home-container">
      {/* ════════════════ 01 — HERO ════════════════ */}
      <section className="hero-section">
        <div className="hero-inner">
          <div className="hero-content">
            <p className="hero-eyebrow">{t('hero.eyebrow')}</p>

            <h1 className="hero-title" aria-label={t('brand.tagline')}>
              <span className="hero-line" aria-hidden="true">
                <span>{t('hero.line1')}</span>
              </span>
              <span className="hero-line" aria-hidden="true">
                <span>{t('hero.line2')}</span>
              </span>
              <span className="hero-line" aria-hidden="true">
                <span>
                  <em>{t('hero.line3')}</em>
                </span>
              </span>
              <span className="hero-line" aria-hidden="true">
                <span>
                  <em>{t('hero.line4')}</em>
                </span>
              </span>
            </h1>

            <Reveal direction="up" delay={520}>
              <p className="hero-description">{hero.heroText || t('hero.text')}</p>
            </Reveal>

            <Reveal direction="up" delay={640}>
              <div className="hero-actions">
                <Link to={hero.primaryCta?.href || '/courses'} className="btn-primary hero-btn btn-shine">
                  {t('hero.primaryCta')}
                  <IconArrowRight size={17} className="hero-btn-arrow" />
                </Link>
                <Link to={hero.secondaryCta?.href || '/knowledge'} className="btn-secondary hero-btn">
                  {t('hero.secondaryCta')}
                </Link>
              </div>
            </Reveal>

            <Reveal direction="up" delay={760}>
              <div className="hero-stats-row">
                <div className="stat-pill">
                  <strong>
                    <CountUp end={stats?.courses || 0} />
                  </strong>
                  <span>{t('hero.stats.courses')}</span>
                </div>
                <div className="stat-pill">
                  <strong>
                    <CountUp end={stats?.quizzes || 0} />
                  </strong>
                  <span>{t('hero.stats.quizzes')}</span>
                </div>
                <div className="stat-pill">
                  <strong>
                    <CountUp end={stats?.books || 0} />
                  </strong>
                  <span>{t('hero.stats.books')}</span>
                </div>
                <div className="stat-pill">
                  <strong>
                    <CountUp end={stats?.categories || 0} suffix="+" />
                  </strong>
                  <span>{t('hero.stats.categories')}</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Layered visual composition */}
          <div className="hero-visual">
            <div className="hero-glow hero-glow-1" aria-hidden="true" />
            <div className="hero-glow hero-glow-2" aria-hidden="true" />
            <div className="hero-ring" aria-hidden="true" />

            <Reveal direction="zoom" delay={340}>
              <div className="hero-frame">
                <div className="hero-frame-photo-wrap">
                  <img
                    className="hero-banner-photo"
                    src="/brand/hero-photo.jpg"
                    alt={t('hero.bannerAlt')}
                    fetchPriority="high"
                  />
                </div>
                <div className="hero-frame-caption" aria-hidden="true">
                  <span>ThinkTank Academia</span>
                  <i>est. MMXXIV</i>
                </div>
              </div>
            </Reveal>

            <div className="hero-brand-chip" aria-hidden="true">
              <BrandLogo className="hero-chip-logo" />
            </div>

            {hero.quote?.text && (
              <blockquote className="hero-quote">
                “{hero.quote.text}”
                <small>— {hero.quote.attribution || 'Albert Einstein'}</small>
              </blockquote>
            )}
          </div>
        </div>

        <div className="hero-scroll-hint" aria-hidden="true">
          <span className="mouse">
            <span className="wheel" />
          </span>
          <span className="scroll-word">{t('hero.scroll')}</span>
        </div>
      </section>

      {/* ════════════════ 01.5 — MARQUEE ════════════════ */}
      <div className="hero-marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <span className="marquee-item" key={copy}>
              {(t('home.marquee') + ' ' + t('home.marquee'))
                .split('•')
                .filter((w: string) => w.trim())
                .map((word: string, i: number) => (
                  <React.Fragment key={i}>
                    {word.trim()}
                    <i />
                  </React.Fragment>
                ))}
            </span>
          ))}
        </div>
      </div>

      {/* ════════════════ 02 — BRAND PHILOSOPHY ════════════════ */}
      <section className="home-section intro-section">
        <div className="section-inner intro-grid">
          <Reveal direction="up">
            <div>
              <p className="section-eyebrow">{t('home.intro.eyebrow')}</p>
              <h2 className="intro-title">{t('home.intro.title')}</h2>
            </div>
          </Reveal>
          <Reveal direction="up" delay={140}>
            <div>
              <p className="intro-lead">{t('home.intro.lead')}</p>
              <ul className="intro-points">
                {(['point1', 'point2', 'point3'] as const).map((k, i) => (
                  <li key={k}>
                    <span className="intro-num">0{i + 1}</span>
                    <span>{t(`home.intro.${k}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════ 03 — THE SEVEN PILLARS ════════════════ */}
      <section className="home-section pillars-section">
        <div className="section-inner wide">
          <Reveal>
            <div className="section-header split-header">
              <div>
                <p className="section-eyebrow">{t('home.categories.eyebrow')}</p>
                <h2 className="section-title">{t('home.categories.title')}</h2>
                <p className="section-subtitle">{t('home.categories.subtitle')}</p>
              </div>
            </div>
          </Reveal>

          <div className="pillars-list">
            {PILLARS.map((pillar, idx) => {
              return (
                <Reveal direction="up" delay={Math.min(idx * 70, 420)} key={pillar.id}>
                  <Link to={apiSectionById[pillar.id]?.path || pillar.path} className="pillar-row">
                    <span className="pillar-num">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="pillar-info">
                      <h3 className="pillar-name">{t(`home.pillars.${pillar.i18n}.name`)}</h3>
                      <p className="pillar-desc">{t(`home.pillars.${pillar.i18n}.desc`)}</p>
                    </span>
                    <span className="pillar-thumb" aria-hidden="true">
                      <img src={pillar.img} alt="" loading="lazy" />
                    </span>
                    <span className="pillar-arrow" aria-hidden="true">
                      <IconArrowUpRight size={17} />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════ 04 — FEATURED COURSES ════════════════ */}
      {data.featured_courses?.length > 0 && (
        <section className="home-section cream-bg">
          <div className="section-inner">
            <Reveal>
              <div className="section-header split-header">
                <div>
                  <p className="section-eyebrow">{t('home.featured.eyebrow')}</p>
                  <h2 className="section-title">{t('home.featured.title')}</h2>
                  <p className="section-subtitle">{t('home.featured.subtitle')}</p>
                </div>
                <Link to="/courses" className="view-all-link">
                  {t('home.featured.link')}
                </Link>
              </div>
            </Reveal>

            <div className="cards-grid featured-grid">
              <RevealGroup direction="up" stagger={110}>
                {data.featured_courses.slice(0, 5).map((course: any) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </RevealGroup>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════ 05 — CONTINUE LEARNING (authenticated) ════════════════ */}
      {user && continueItems.length > 0 && (
        <section className="home-section continue-section">
          <div className="section-inner">
            <Reveal direction="up">
              <div className="continue-panel">
                <div className="continue-panel-head">
                  <div>
                    <p className="section-eyebrow">{t('home.continue.eyebrow')}</p>
                    <h2 className="section-title">{t('home.continue.title')}</h2>
                  </div>
                  <Link to="/my-learning" className="view-all-link">
                    {t('home.continue.link')}
                  </Link>
                </div>

                <div className="home-continue-grid">
                  {continueItems.map((c: any) => (
                    <div key={c.id} className="home-continue-card">
                      <span className="course-cat-tag">{c.category || c.section}</span>
                      <h3>
                        <Link to={`/courses/${c.slug}`}>{c.title}</Link>
                      </h3>
                      <div className="hc-progress-row">
                        <div className="progress-bar-small">
                          <div className="progress-fill" style={{ width: `${c.progress}%` }} />
                        </div>
                        <span className="progress-pct-text">{c.progress}%</span>
                      </div>
                      <Link
                        to={c.last_lesson_id ? `/lessons/${c.last_lesson_id}` : `/courses/${c.slug}`}
                        className="hc-resume"
                      >
                        {t('home.continue.resume')}
                        <IconArrowRight size={14} className="hero-btn-arrow" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ════════════════ 06 — KNOWLEDGE SPOTLIGHT ════════════════ */}
      {spotlightItems.length > 0 && (
        <section className="home-section spotlight-section">
          <div className="section-inner">
            <Reveal>
              <div className="section-header split-header">
                <div>
                  <p className="section-eyebrow">{t('home.spotlight.eyebrow')}</p>
                  <h2 className="section-title">{t('home.spotlight.title')}</h2>
                </div>
                <Link to="/knowledge" className="view-all-link">
                  {t('home.spotlight.link')}
                </Link>
              </div>
            </Reveal>

            <div className="spotlight-grid">
              <Reveal direction="right">
                <Link to={spotlightLead ? `/read/${spotlightLead.slug}` : '/knowledge'} className="spotlight-visual">
                  <img src={spotlightLead?.cover_url || '/brand/pillars/knowledge.jpg'} alt="" loading="lazy" />
                  <span className="spotlight-letter" aria-hidden="true">
                    Σ
                  </span>
                  <span className="spotlight-visual-caption">
                    <span>{t('home.spotlight.eyebrow')}</span>
                    <strong>{spotlightLead?.title}</strong>
                  </span>
                </Link>
              </Reveal>

              <div className="spotlight-list">
                {spotlightItems.map((item: any, idx: number) => (
                  <Reveal direction="up" delay={idx * 110} key={item.id}>
                    <Link to={`/read/${item.slug}`} className="spotlight-item">
                      <span className="spot-idx">{String(idx + 1).padStart(2, '0')}</span>
                      <span>
                        <h3>{item.title}</h3>
                        <p>{item.excerpt}</p>
                      </span>
                      <span className="spot-meta">
                        {item.reading_minutes || 2} {t('card.minRead')}
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════ 07 — BOOKS & IDEAS (the library shelf) ════════════════ */}
      {data.books?.length > 0 && (
        <section className="home-section bookshelf-section">
          <div className="section-inner">
            <Reveal>
              <div className="section-header split-header">
                <div>
                  <p className="section-eyebrow">{t('home.books.eyebrow')}</p>
                  <h2 className="section-title">{t('home.books.title')}</h2>
                  <p className="section-subtitle">{t('home.books.subtitle')}</p>
                </div>
                <Link to="/books" className="view-all-link">
                  {t('home.books.link')}
                </Link>
              </div>
            </Reveal>

            <div className="cards-grid books-grid">
              <RevealGroup direction="up" stagger={100}>
                {data.books.slice(0, 4).map((book: any) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </RevealGroup>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════ 08 — WORLD DESK (navy) ════════════════ */}
      {data.world?.length > 0 && (
        <section className="home-section desk-section desk-world">
          <div className="section-inner">
            <Reveal>
              <div className="section-header split-header">
                <div>
                  <p className="section-eyebrow gold">{t('home.world.eyebrow')}</p>
                  <h2 className="section-title">{t('home.world.title')}</h2>
                  <p className="section-subtitle">{t('home.world.subtitle')}</p>
                </div>
                <Link to="/world" className="view-all-link">
                  {t('home.world.link')}
                </Link>
              </div>
            </Reveal>

            <div className="cards-grid">
              <RevealGroup direction="up" stagger={110}>
                {data.world.slice(0, 3).map((item: any) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </RevealGroup>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════ 09 — HUMANITY (warm storytelling) ════════════════ */}
      {data.humanity?.length > 0 && (
        <section className="home-section desk-section desk-humanity">
          <div className="section-inner">
            <Reveal>
              <div className="section-header split-header">
                <div>
                  <p className="section-eyebrow">{t('home.humanity.eyebrow')}</p>
                  <h2 className="section-title">{t('home.humanity.title')}</h2>
                  <p className="section-subtitle">{t('home.humanity.subtitle')}</p>
                </div>
                <Link to="/humanity" className="view-all-link">
                  {t('home.humanity.link')}
                </Link>
              </div>
            </Reveal>

            <div className="cards-grid">
              <RevealGroup direction="up" stagger={110}>
                {data.humanity.slice(0, 3).map((item: any) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </RevealGroup>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════ 10 — SOCIETY (outlined word backdrop) ════════════════ */}
      {data.society?.length > 0 && (
        <section className="home-section desk-section desk-society">
          <span className="backdrop-word" aria-hidden="true">
            UNITY
          </span>
          <div className="section-inner">
            <Reveal>
              <div className="section-header split-header">
                <div>
                  <p className="section-eyebrow">{t('home.society.eyebrow')}</p>
                  <h2 className="section-title">{t('home.society.title')}</h2>
                  <p className="section-subtitle">{t('home.society.subtitle')}</p>
                </div>
                <Link to="/society" className="view-all-link">
                  {t('home.society.link')}
                </Link>
              </div>
            </Reveal>

            <div className="cards-grid">
              <RevealGroup direction="up" stagger={110}>
                {data.society.slice(0, 3).map((item: any) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </RevealGroup>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════ 11 — QUIZZES & MODEL TESTS ════════════════ */}
      {data.quizzes?.length > 0 && (
        <section className="home-section cream-bg">
          <div className="section-inner">
            <Reveal>
              <div className="section-header split-header">
                <div>
                  <p className="section-eyebrow">{t('home.quizzes.eyebrow')}</p>
                  <h2 className="section-title">{t('home.quizzes.title')}</h2>
                  <p className="section-subtitle">{t('home.quizzes.subtitle')}</p>
                </div>
                <Link to="/quizzes" className="view-all-link">
                  {t('home.quizzes.link')}
                </Link>
              </div>
            </Reveal>

            <div className="cards-grid">
              <RevealGroup direction="up" stagger={110}>
                {data.quizzes.slice(0, 3).map((quiz: any) => (
                  <QuizCard key={quiz.id} quiz={quiz} />
                ))}
              </RevealGroup>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════ 12 — LEARNING PHILOSOPHY (principles) ════════════════ */}
      <section className="home-section navy-bg">
        <div className="section-inner">
          <Reveal>
            <div className="section-header light">
              <p className="section-eyebrow gold">{t('home.philosophy.eyebrow')}</p>
              <h2 className="section-title white">{t('home.philosophy.title')}</h2>
            </div>
          </Reveal>

          <div className="principles-grid">
            {([
              { n: '01', t: t('home.philosophy.p1t'), d: t('home.philosophy.p1d') },
              { n: '02', t: t('home.philosophy.p2t'), d: t('home.philosophy.p2d') },
              { n: '03', t: t('home.philosophy.p3t'), d: t('home.philosophy.p3d') },
            ] as const).map((p, idx) => (
              <Reveal direction="up" delay={idx * 140} key={p.n}>
                <div className="principle-card">
                  <strong className="principle-number">{p.n}</strong>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ 13 — FINAL CTA ════════════════ */}
      <section className="home-section cta-banner-section">
        <div className="section-inner">
          <Reveal direction="zoom">
            <div className="cta-banner">
              <h2>{t('home.cta.title')}</h2>
              <p>{t('home.cta.text')}</p>
              <div className="cta-actions">
                <Link to="/register" className="btn-primary btn-shine">
                  {t('home.cta.primary')}
                  <IconArrowRight size={16} className="hero-btn-arrow" />
                </Link>
                <Link to="/courses" className="btn-secondary">
                  {t('home.cta.secondary')}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};
