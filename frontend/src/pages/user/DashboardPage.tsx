import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { learningApi } from '../../api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import type { DashboardData } from '../../types/index.ts';
import { LoadingState, ErrorState } from '../../components/States.tsx';
import { useI18n } from '../../i18n/index.tsx';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    learningApi
      .getDashboard()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t('dashboard.errorLoad'));
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingState message={t('dashboard.loading')} />;
  if (error || !data) return <ErrorState error={error || t('dashboard.errorLoad')} onRetry={() => window.location.reload()} />;

  const { stats, continue_learning, attempts, recently_viewed } = data;

  return (
    <div className="page-container dashboard-page">
      {/* Welcome Banner */}
      <div className="dashboard-banner">
        <div className="dash-banner-left">
          <p className="dash-eyebrow">{t('dashboard.eyebrow')}</p>
          <h1 className="dash-welcome">{t('dashboard.welcome', { name: user?.name || t('dashboard.learner') })}</h1>
          <p className="dash-sub">{t('dashboard.sub')}</p>
        </div>

        <div className="dash-banner-actions">
          <Link to="/courses" className="btn-primary">
            {t('dashboard.browseCourses')}
          </Link>
          <Link to="/quizzes" className="btn-secondary">
            {t('dashboard.takeQuiz')}
          </Link>
        </div>
      </div>

      {/* Numerical Metrics Cards (Real DB values) */}
      <div className="dash-metrics-grid">
        <div className="metric-card">
          <span className="metric-val">{stats.enrolled_courses}</span>
          <span className="metric-lbl">{t('dashboard.enrolled')}</span>
          <Link to="/my-learning" className="metric-sublink">{t('dashboard.viewAll')} →</Link>
        </div>

        <div className="metric-card">
          <span className="metric-val">{stats.completed_lessons}</span>
          <span className="metric-lbl">{t('dashboard.completedLessons')}</span>
          <span className="metric-note">{t('dashboard.realProgress')}</span>
        </div>

        <div className="metric-card">
          <span className="metric-val">{stats.completed_courses}</span>
          <span className="metric-lbl">{t('dashboard.finishedCourses')}</span>
          <span className="metric-note">{t('dashboard.masteredPaths')}</span>
        </div>

        <div className="metric-card">
          <span className="metric-val">{stats.quizzes_taken}</span>
          <span className="metric-lbl">{t('dashboard.quizzesTaken')}</span>
          <span className="metric-note">{t('dashboard.evaluatedTests')}</span>
        </div>

        <div className="metric-card">
          <span className="metric-val">{stats.best_percentage}%</span>
          <span className="metric-lbl">{t('dashboard.topScore')}</span>
          <span className="metric-note">{t('dashboard.personalRecord')}</span>
        </div>

        <div className="metric-card">
          <span className="metric-val">{stats.bookmarks}</span>
          <span className="metric-lbl">{t('dashboard.bookmarks')}</span>
          <Link to="/bookmarks" className="metric-sublink">{t('dashboard.savedItems')} →</Link>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="dashboard-content-layout">
        {/* Left Column: Continue Learning */}
        <div className="dashboard-main-col">
          <section className="dash-section-block">
            <div className="dash-block-header">
              <h2>{t('dashboard.continueLearning')}</h2>
              <Link to="/my-learning">{t('dashboard.allEnrolled')} ({stats.enrolled_courses}) →</Link>
            </div>

            {continue_learning.length === 0 ? (
              <div className="dash-empty-prompt">
                <p>{t('dashboard.noEnroll')}</p>
                <Link to="/courses" className="btn-primary-sm">
                  {t('dashboard.exploreCatalog')} →
                </Link>
              </div>
            ) : (
              <div className="continue-cards-stack">
                {continue_learning.map((c: any) => (
                  <div key={c.id} className="continue-course-card">
                    <div className="continue-info">
                      <span className="course-cat-tag">{c.category || c.section}</span>
                      <h3>
                        <Link to={`/courses/${c.slug}`}>{c.title}</Link>
                      </h3>
                      <div className="continue-progress-row">
                        <div className="progress-bar-small">
                          <div className="progress-fill" style={{ width: `${c.progress}%` }} />
                        </div>
                        <span className="progress-pct-text">
                          {c.progress}% ({t('user.myLearning.lessonsDone', { done: c.completed_lessons, total: c.total_lessons })})
                        </span>
                      </div>
                    </div>

                    <div className="continue-actions">
                      <Link
                        to={c.last_lesson_id ? `/lessons/${c.last_lesson_id}` : `/courses/${c.slug}`}
                        className="btn-primary-sm"
                      >
                        {t('dashboard.resume')} →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Quiz Attempts */}
          <section className="dash-section-block">
            <div className="dash-block-header">
              <h2>{t('dashboard.recentResults')}</h2>
              <Link to="/quizzes">{t('dashboard.takeNew')} →</Link>
            </div>

            {attempts.length === 0 ? (
              <div className="dash-empty-prompt">
                <p>{t('dashboard.noAttempts')}</p>
                <Link to="/quizzes" className="btn-secondary-sm">
                  {t('dashboard.firstTest')} →
                </Link>
              </div>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>{t('dashboard.thQuiz')}</th>
                      <th>{t('dashboard.thType')}</th>
                      <th>{t('dashboard.thScore')}</th>
                      <th>{t('dashboard.thResult')}</th>
                      <th>{t('dashboard.thDate')}</th>
                      <th>{t('dashboard.thAction')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((att: any) => (
                      <tr key={att.id}>
                        <td>
                          <strong>{att.quiz_title}</strong>
                        </td>
                        <td>
                          <span className="badge-quiz-kind small">
                            {att.quiz_kind?.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <strong>{att.score}</strong> / {att.total} ({att.percentage}%)
                        </td>
                        <td>
                          <span className={`pass-badge ${att.passed ? 'passed' : 'failed'}`}>
                            {att.passed ? t('dashboard.passed') : t('dashboard.reviewTag')}
                          </span>
                        </td>
                        <td>
                          {att.submitted_at ? new Date(att.submitted_at).toLocaleDateString() : t('dashboard.inProgress')}
                        </td>
                        <td>
                          <Link to={`/quiz-results/${att.id}`} className="btn-table-action">
                            {t('dashboard.reviewAnswers')} →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: History & Shortcuts */}
        <aside className="dashboard-sidebar-col">
          {/* Quick Hub Links */}
          <div className="dash-sidebar-card">
            <h3>{t('dashboard.quickActions')}</h3>
            <ul className="dash-quick-links">
              <li><Link to="/my-learning">📚 {t('dashboard.myCourses')}</Link></li>
              <li><Link to="/bookmarks">★ {t('dashboard.savedBookmarks')}</Link></li>
              <li><Link to="/quizzes">✍ {t('dashboard.practiceQuizzes')}</Link></li>
              <li><Link to="/profile">👤 {t('dashboard.editProfile')}</Link></li>
              <li><Link to="/settings">⚙ {t('dashboard.accountSettings')}</Link></li>
            </ul>
          </div>

          {/* Recently Viewed */}
          {recently_viewed && recently_viewed.length > 0 && (
            <div className="dash-sidebar-card">
              <h3>{t('dashboard.recentlyViewed')}</h3>
              <ul className="recent-views-list">
                {recently_viewed.map((item: any, idx: number) => {
                  const href =
                    item.item_type === 'COURSE'
                      ? `/courses/${item.item_slug}`
                      : item.item_type === 'LESSON'
                      ? `/lessons/${item.item_id}`
                      : `/read/${item.item_slug}`;

                  return (
                    <li key={idx} className="recent-view-item">
                      <span className="recent-type-tag">{item.item_type}</span>
                      <Link to={href} className="recent-title-link">
                        {item.item_title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
