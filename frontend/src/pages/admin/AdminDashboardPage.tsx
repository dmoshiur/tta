import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api.ts';
import { LoadingState, ErrorState } from '../../components/States.tsx';
import { useI18n } from '../../i18n/index.tsx';

export const AdminDashboardPage: React.FC = () => {
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getOverview()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t('adminDash.loadFail'));
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingState message={t('adminDash.loading')} />;
  if (error || !data) return <ErrorState error={error || t('adminDash.loadFail')} onRetry={() => window.location.reload()} />;

  const { stats, recent_activity, recent_enrollments, recent_attempts } = data;

  return (
    <div className="page-container admin-hub-page">
      {/* Header */}
      <header className="admin-page-header">
        <div className="admin-header-title-wrap">
          <span className="admin-security-pill">{t('adminDash.pill')}</span>
          <h1 className="admin-page-title">{t('adminDash.title')}</h1>
          <p className="admin-page-desc">{t('adminDash.desc')}</p>
        </div>

        <div className="admin-quick-nav">
          <Link to="/admin/r/courses" className="btn-primary-sm">{t('adminDash.manageCourses')}</Link>
          <Link to="/admin/r/content" className="btn-primary-sm">{t('adminDash.manageArticles')}</Link>
          <Link to="/admin/r/quizzes" className="btn-primary-sm">{t('adminDash.manageQuizzes')}</Link>
          <Link to="/admin/media" className="btn-secondary-sm">{t('adminNav.media')}</Link>
        </div>
      </header>

      {/* Real Statistics Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span className="stat-label">{t('adminDash.totalUsers')}</span>
          <strong className="stat-value">{stats.users}</strong>
          <Link to="/admin/users" className="stat-action-link">{t('adminDash.manageUsers')} →</Link>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">{t('adminDash.courses')}</span>
          <strong className="stat-value">{stats.courses}</strong>
          <span className="stat-subdetail">{t('adminDash.publishedLessons', { pub: stats.published_courses, lessons: stats.lessons })}</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">{t('adminDash.editorial')}</span>
          <strong className="stat-value">{stats.content}</strong>
          <span className="stat-subdetail">{t('adminDash.editorialSub')}</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">{t('adminDash.booksLib')}</span>
          <strong className="stat-value">{stats.books}</strong>
          <Link to="/admin/r/books" className="stat-action-link">{t('adminDash.manageBooks')} →</Link>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">{t('adminDash.quizzes')}</span>
          <strong className="stat-value">{stats.quizzes}</strong>
          <span className="stat-subdetail">{t('adminDash.bankQ', { n: stats.questions })}</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">{t('adminDash.enrollments')}</span>
          <strong className="stat-value">{stats.enrollments}</strong>
          <span className="stat-subdetail">{t('adminDash.finished', { n: stats.completed_enrollments })}</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">{t('adminDash.submissions')}</span>
          <strong className="stat-value">{stats.attempts}</strong>
          <Link to="/admin/analytics" className="stat-action-link">{t('adminDash.viewAnalytics')} →</Link>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">{t('adminDash.inquiries')}</span>
          <strong className="stat-value">{stats.pending_messages}</strong>
          <Link to="/admin/r/contacts" className="stat-action-link">{t('adminDash.viewMessages')} →</Link>
        </div>
      </div>

      {/* Navigation Directory Cards */}
      <section className="admin-directory-section">
        <h2 className="admin-section-heading">{t('adminDash.resourceMgmt')}</h2>
        <div className="admin-resource-cards">
          <div className="res-nav-card">
            <h3>🎓 {t('adminNav.gLms')}</h3>
            <ul>
              <li><Link to="/admin/r/courses">{t('adminNav.courses')} ({stats.courses})</Link></li>
              <li><Link to="/admin/r/modules">{t('adminNav.modules')} ({stats.modules})</Link></li>
              <li><Link to="/admin/r/lessons">{t('adminNav.lessons')} ({stats.lessons})</Link></li>
              <li><Link to="/admin/r/assignments">{t('adminDash.assignments')}</Link></li>
            </ul>
          </div>

          <div className="res-nav-card">
            <h3>✍ {t('adminNav.gAssess')}</h3>
            <ul>
              <li><Link to="/admin/r/quizzes">{t('adminNav.quizzes')} ({stats.quizzes})</Link></li>
              <li><Link to="/admin/r/questions">{t('adminDash.questionBank')} ({stats.questions})</Link></li>
              <li><Link to="/admin/r/attempts">{t('adminDash.attemptHistory')} ({stats.attempts})</Link></li>
            </ul>
          </div>

          <div className="res-nav-card">
            <h3>📖 {t('adminNav.gEditorial')}</h3>
            <ul>
              <li><Link to="/admin/r/content">{t('adminNav.content')} ({stats.content})</Link></li>
              <li><Link to="/admin/r/books">{t('adminNav.books')} ({stats.books})</Link></li>
              <li><Link to="/admin/r/categories">{t('adminDash.taxonomy')} ({stats.categories})</Link></li>
            </ul>
          </div>

          <div className="res-nav-card">
            <h3>⚙ {t('adminDash.ops')}</h3>
            <ul>
              <li><Link to="/admin/users">{t('adminDash.userDir')}</Link></li>
              <li><Link to="/admin/roles">{t('adminDash.roleMatrix')}</Link></li>
              <li><Link to="/admin/settings">{t('adminDash.siteSettings')}</Link></li>
              <li><Link to="/admin/media">{t('adminDash.mediaLib')}</Link></li>
              <li><Link to="/admin/r/contacts">{t('adminNav.contacts')} ({stats.pending_messages})</Link></li>
              <li><Link to="/admin/r/subscribers">{t('adminDash.newsletterSubs')} ({stats.subscribers})</Link></li>
              <li><Link to="/admin/analytics">{t('adminNav.analytics')}</Link></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tables Row: Recent Enrollments & Recent Attempts */}
      <div className="admin-tables-row">
        {/* Enrollments table */}
        <div className="admin-table-panel">
          <div className="panel-header">
            <h3>{t('adminDash.recentEnrollments')}</h3>
            <span className="panel-tag">{t('adminDash.nRecent', { n: recent_enrollments?.length || 0 })}</span>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('adminDash.thLearner')}</th>
                  <th>{t('adminDash.thCourse')}</th>
                  <th>{t('adminDash.thDate')}</th>
                </tr>
              </thead>
              <tbody>
                {recent_enrollments?.map((e: any, idx: number) => (
                  <tr key={idx}>
                    <td>
                      <strong>{e.user_name}</strong>
                      <small className="cell-sub">{e.user_email}</small>
                    </td>
                    <td><Link to={`/courses/${e.course_slug}`}>{e.course_title}</Link></td>
                    <td>{new Date(e.enrolled_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attempts table */}
        <div className="admin-table-panel">
          <div className="panel-header">
            <h3>{t('adminDash.recentSubmissions')}</h3>
            <span className="panel-tag">{t('adminDash.nRecent', { n: recent_attempts?.length || 0 })}</span>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('adminDash.thLearner')}</th>
                  <th>{t('adminDash.thQuiz')}</th>
                  <th>{t('adminDash.thScore')}</th>
                  <th>{t('adminDash.thDate')}</th>
                </tr>
              </thead>
              <tbody>
                {recent_attempts?.map((a: any, idx: number) => (
                  <tr key={idx}>
                    <td><strong>{a.learner}</strong></td>
                    <td>{a.quiz_title}</td>
                    <td>
                      <span className={`score-badge ${a.passed ? 'pass' : 'fail'}`}>
                        {a.score} / {a.total} ({a.percentage}%)
                      </span>
                    </td>
                    <td>{new Date(a.submitted_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* System Activity Log */}
      <section className="admin-activity-section">
        <h2 className="admin-section-heading">{t('adminDash.auditLog')}</h2>
        <div className="activity-timeline-card">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('adminDash.thActor')}</th>
                  <th>{t('adminDash.thAction')}</th>
                  <th>{t('adminDash.thEntity')}</th>
                  <th>{t('adminDash.thLabel')}</th>
                  <th>{t('adminDash.thTimestamp')}</th>
                </tr>
              </thead>
              <tbody>
                {recent_activity?.map((act: any) => (
                  <tr key={act.id}>
                    <td><strong>{act.actor_name}</strong></td>
                    <td><span className="action-tag">{act.action}</span></td>
                    <td>{act.entity_type}</td>
                    <td>{act.entity_label}</td>
                    <td>{new Date(act.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
