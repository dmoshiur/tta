import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { learningApi } from '../../api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import type { DashboardData } from '../../types/index.ts';
import { LoadingState, ErrorState } from '../../components/States.tsx';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
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
        setError(err.message || 'Failed to load dashboard data.');
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingState message="Loading your personal dashboard…" />;
  if (error || !data) return <ErrorState error={error || 'Could not load dashboard.'} onRetry={() => window.location.reload()} />;

  const { stats, continue_learning, attempts, recently_viewed } = data;

  return (
    <div className="page-container dashboard-page">
      {/* Welcome Banner */}
      <div className="dashboard-banner">
        <div className="dash-banner-left">
          <p className="dash-eyebrow">LEARNER DASHBOARD</p>
          <h1 className="dash-welcome">Welcome back, {user?.name || 'Learner'}</h1>
          <p className="dash-sub">
            Track your course progression, review recent model test results, and resume your studies.
          </p>
        </div>

        <div className="dash-banner-actions">
          <Link to="/courses" className="btn-primary">
            Browse Courses
          </Link>
          <Link to="/quizzes" className="btn-secondary">
            Take a Quiz
          </Link>
        </div>
      </div>

      {/* Numerical Metrics Cards (Real DB values) */}
      <div className="dash-metrics-grid">
        <div className="metric-card">
          <span className="metric-val">{stats.enrolled_courses}</span>
          <span className="metric-lbl">Enrolled Courses</span>
          <Link to="/my-learning" className="metric-sublink">View all →</Link>
        </div>

        <div className="metric-card">
          <span className="metric-val">{stats.completed_lessons}</span>
          <span className="metric-lbl">Completed Lessons</span>
          <span className="metric-note">Real progress</span>
        </div>

        <div className="metric-card">
          <span className="metric-val">{stats.completed_courses}</span>
          <span className="metric-lbl">Finished Courses</span>
          <span className="metric-note">Mastered paths</span>
        </div>

        <div className="metric-card">
          <span className="metric-val">{stats.quizzes_taken}</span>
          <span className="metric-lbl">Quizzes Submitted</span>
          <span className="metric-note">Evaluated tests</span>
        </div>

        <div className="metric-card">
          <span className="metric-val">{stats.best_percentage}%</span>
          <span className="metric-lbl">Top Quiz Score</span>
          <span className="metric-note">Personal record</span>
        </div>

        <div className="metric-card">
          <span className="metric-val">{stats.bookmarks}</span>
          <span className="metric-lbl">Bookmarks</span>
          <Link to="/bookmarks" className="metric-sublink">Saved items →</Link>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="dashboard-content-layout">
        {/* Left Column: Continue Learning */}
        <div className="dashboard-main-col">
          <section className="dash-section-block">
            <div className="dash-block-header">
              <h2>Continue Learning</h2>
              <Link to="/my-learning">All Enrolled Courses ({stats.enrolled_courses}) →</Link>
            </div>

            {continue_learning.length === 0 ? (
              <div className="dash-empty-prompt">
                <p>You haven't enrolled in any courses yet.</p>
                <Link to="/courses" className="btn-primary-sm">
                  Explore Course Catalog →
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
                          {c.progress}% ({c.completed_lessons}/{c.total_lessons} lessons)
                        </span>
                      </div>
                    </div>

                    <div className="continue-actions">
                      <Link
                        to={c.last_lesson_id ? `/lessons/${c.last_lesson_id}` : `/courses/${c.slug}`}
                        className="btn-primary-sm"
                      >
                        Resume →
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
              <h2>Recent Quiz & Test Results</h2>
              <Link to="/quizzes">Take a new quiz →</Link>
            </div>

            {attempts.length === 0 ? (
              <div className="dash-empty-prompt">
                <p>No submitted quiz attempts yet.</p>
                <Link to="/quizzes" className="btn-secondary-sm">
                  Start Your First Practice Test →
                </Link>
              </div>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Quiz / Test</th>
                      <th>Type</th>
                      <th>Score</th>
                      <th>Result</th>
                      <th>Date</th>
                      <th>Action</th>
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
                            {att.passed ? 'Passed' : 'Review'}
                          </span>
                        </td>
                        <td>
                          {att.submitted_at ? new Date(att.submitted_at).toLocaleDateString() : 'In progress'}
                        </td>
                        <td>
                          <Link to={`/quiz-results/${att.id}`} className="btn-table-action">
                            Review Answers →
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
            <h3>Quick Actions</h3>
            <ul className="dash-quick-links">
              <li><Link to="/my-learning">📚 My Enrolled Courses</Link></li>
              <li><Link to="/bookmarks">★ Saved Bookmarks</Link></li>
              <li><Link to="/quizzes">✍ Practice Quizzes</Link></li>
              <li><Link to="/profile">👤 Edit Profile</Link></li>
              <li><Link to="/settings">⚙ Account Settings</Link></li>
            </ul>
          </div>

          {/* Recently Viewed */}
          {recently_viewed && recently_viewed.length > 0 && (
            <div className="dash-sidebar-card">
              <h3>Recently Viewed</h3>
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
