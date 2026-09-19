import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api.ts';
import { LoadingState, ErrorState } from '../../components/States.tsx';

export const AdminDashboardPage: React.FC = () => {
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
        setError(err.message || 'Failed to load admin metrics.');
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingState message="Loading administrative intelligence…" />;
  if (error || !data) return <ErrorState error={error || 'Could not load admin hub.'} onRetry={() => window.location.reload()} />;

  const { stats, recent_activity, recent_enrollments, recent_attempts } = data;

  return (
    <div className="page-container admin-hub-page">
      {/* Header */}
      <header className="admin-page-header">
        <div className="admin-header-title-wrap">
          <span className="admin-security-pill">ADMINISTRATIVE CONSOLE</span>
          <h1 className="admin-page-title">Platform Operations Center</h1>
          <p className="admin-page-desc">
            Full-stack management of curriculum, editorial content, user credentials, assessment engines, and analytics.
          </p>
        </div>

        <div className="admin-quick-nav">
          <Link to="/admin/r/courses" className="btn-primary-sm">Manage Courses</Link>
          <Link to="/admin/r/content" className="btn-primary-sm">Manage Articles</Link>
          <Link to="/admin/r/quizzes" className="btn-primary-sm">Manage Quizzes</Link>
          <Link to="/admin/media" className="btn-secondary-sm">Media Library</Link>
        </div>
      </header>

      {/* Real Statistics Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span className="stat-label">Total Users</span>
          <strong className="stat-value">{stats.users}</strong>
          <Link to="/admin/users" className="stat-action-link">Manage users →</Link>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">Courses</span>
          <strong className="stat-value">{stats.courses}</strong>
          <span className="stat-subdetail">{stats.published_courses} published ({stats.lessons} lessons)</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">Editorial Content</span>
          <strong className="stat-value">{stats.content}</strong>
          <span className="stat-subdetail">Articles, Knowledge & World</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">Books Library</span>
          <strong className="stat-value">{stats.books}</strong>
          <Link to="/admin/r/books" className="stat-action-link">Manage books →</Link>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">Quizzes & Tests</span>
          <strong className="stat-value">{stats.quizzes}</strong>
          <span className="stat-subdetail">{stats.questions} questions in bank</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">Course Enrollments</span>
          <strong className="stat-value">{stats.enrollments}</strong>
          <span className="stat-subdetail">{stats.completed_enrollments} finished</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">Quiz Submissions</span>
          <strong className="stat-value">{stats.attempts}</strong>
          <Link to="/admin/analytics" className="stat-action-link">View analytics →</Link>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">Contact Inquiries</span>
          <strong className="stat-value">{stats.pending_messages}</strong>
          <Link to="/admin/r/contacts" className="stat-action-link">View messages →</Link>
        </div>
      </div>

      {/* Navigation Directory Cards */}
      <section className="admin-directory-section">
        <h2 className="admin-section-heading">Platform Resource Management</h2>
        <div className="admin-resource-cards">
          <div className="res-nav-card">
            <h3>🎓 Learning & LMS</h3>
            <ul>
              <li><Link to="/admin/r/courses">Courses ({stats.courses})</Link></li>
              <li><Link to="/admin/r/modules">Course Modules ({stats.modules})</Link></li>
              <li><Link to="/admin/r/lessons">Lessons ({stats.lessons})</Link></li>
              <li><Link to="/admin/r/assignments">Assignments & Submissions</Link></li>
            </ul>
          </div>

          <div className="res-nav-card">
            <h3>✍ Assessments</h3>
            <ul>
              <li><Link to="/admin/r/quizzes">Quizzes & Model Tests ({stats.quizzes})</Link></li>
              <li><Link to="/admin/r/questions">MCQ Question Bank ({stats.questions})</Link></li>
              <li><Link to="/admin/r/attempts">Learner Attempt History ({stats.attempts})</Link></li>
            </ul>
          </div>

          <div className="res-nav-card">
            <h3>📖 Editorial & Library</h3>
            <ul>
              <li><Link to="/admin/r/content">Articles & Sections ({stats.content})</Link></li>
              <li><Link to="/admin/r/books">Books & Summaries ({stats.books})</Link></li>
              <li><Link to="/admin/r/categories">Taxonomy Categories ({stats.categories})</Link></li>
            </ul>
          </div>

          <div className="res-nav-card">
            <h3>⚙ Operations & Security</h3>
            <ul>
              <li><Link to="/admin/users">User Directory & Roles</Link></li>
              <li><Link to="/admin/roles">Role Permissions Matrix</Link></li>
              <li><Link to="/admin/settings">Homepage & Navigation Settings</Link></li>
              <li><Link to="/admin/media">Media & File Library</Link></li>
              <li><Link to="/admin/r/contacts">Contact Messages ({stats.pending_messages})</Link></li>
              <li><Link to="/admin/r/subscribers">Newsletter Subscribers ({stats.subscribers})</Link></li>
              <li><Link to="/admin/analytics">Analytics & Performance</Link></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tables Row: Recent Enrollments & Recent Attempts */}
      <div className="admin-tables-row">
        {/* Enrollments table */}
        <div className="admin-table-panel">
          <div className="panel-header">
            <h3>Recent Course Enrollments</h3>
            <span className="panel-tag">{recent_enrollments?.length || 0} recent</span>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Course</th>
                  <th>Date</th>
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
            <h3>Recent Quiz Submissions</h3>
            <span className="panel-tag">{recent_attempts?.length || 0} recent</span>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Quiz</th>
                  <th>Score</th>
                  <th>Date</th>
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
        <h2 className="admin-section-heading">Recent System Activity Audit Log</h2>
        <div className="activity-timeline-card">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Label</th>
                  <th>Timestamp</th>
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
