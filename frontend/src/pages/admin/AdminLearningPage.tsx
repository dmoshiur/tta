import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api.ts';
import { LoadingState, ErrorState } from '../../components/States.tsx';
import { ConsoleHeader, ConsoleSection, MetricCard } from '../../components/admin/AdminBits.tsx';

/* Learning Management — hub for the LMS side of the platform:
   modules, lessons, assignments and learner progress. */

export const AdminLearningPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [assignmentsTotal, setAssignmentsTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminApi.getOverview(),
      adminApi.listResource('assignments', { limit: 1 }).catch(() => null),
    ])
      .then(([res, assignmentRes]) => {
        setData(res);
        setAssignmentsTotal(assignmentRes ? assignmentRes.total : null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load learning data.');
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingState message="Loading learning management…" />;
  if (error || !data) return <ErrorState error={error || 'Failed to load learning data.'} onRetry={() => window.location.reload()} />;

  const { stats, recent_enrollments } = data;
  const completionRate = stats.enrollments ? Math.round((stats.completed_enrollments / stats.enrollments) * 100) : 0;

  return (
    <div className="page-container admin-hub-page">
      <ConsoleHeader
        title="Learning Management"
        desc="Curriculum operations — structure courses, publish lessons, manage assignments and follow learner progress."
      >
        <Link to="/admin/courses" className="btn-primary-sm">Manage Courses</Link>
        <Link to="/admin/r/modules/new" className="btn-secondary-sm">+ New Module</Link>
        <Link to="/admin/r/lessons/new" className="btn-secondary-sm">+ New Lesson</Link>
      </ConsoleHeader>

      <div className="sa-metrics-grid">
        <MetricCard label="Courses" value={stats.courses} hint={`${stats.published_courses} published`} linkTo="/admin/courses" />
        <MetricCard label="Modules" value={stats.modules} hint="Course containers" linkTo="/admin/r/modules" />
        <MetricCard label="Lessons" value={stats.lessons} hint="Teaching units" linkTo="/admin/r/lessons" />
        <MetricCard label="Assignments" value={assignmentsTotal ?? '—'} hint="Graded coursework" linkTo="/admin/r/assignments" tone="info" />
        <MetricCard label="Enrollments" value={stats.enrollments} hint={`${stats.completed_enrollments} completed`} linkTo="/admin/analytics" />
        <MetricCard
          label="Completion Rate"
          value={`${completionRate}%`}
          tone={completionRate >= 50 ? 'good' : completionRate >= 20 ? 'warn' : 'bad'}
          hint="Finished vs started"
        />
      </div>

      <ConsoleSection title="Curriculum Management">
        <div className="admin-resource-cards">
          <div className="res-nav-card">
            <h3>🧩 Structure</h3>
            <ul>
              <li><Link to="/admin/courses">Courses ({stats.courses})</Link></li>
              <li><Link to="/admin/r/modules">Modules ({stats.modules})</Link></li>
              <li><Link to="/admin/r/lessons">Lessons ({stats.lessons})</Link></li>
            </ul>
          </div>
          <div className="res-nav-card">
            <h3>📝 Coursework</h3>
            <ul>
              <li><Link to="/admin/r/assignments">Assignments</Link></li>
              <li><Link to="/admin/r/attempts">Quiz attempts ({stats.attempts})</Link></li>
              <li><Link to="/admin/analytics">Engagement analytics</Link></li>
            </ul>
          </div>
          <div className="res-nav-card">
            <h3>📚 Library</h3>
            <ul>
              <li><Link to="/admin/books">Books ({stats.books})</Link></li>
              <li><Link to="/admin/r/content">Articles & sections ({stats.content})</Link></li>
              <li><Link to="/admin/categories">Categories ({stats.categories})</Link></li>
            </ul>
          </div>
        </div>
      </ConsoleSection>

      <ConsoleSection title="Recent Enrollments" tag={`${recent_enrollments?.length || 0} latest`}>
        <div className="admin-table-panel full-width">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Course</th>
                  <th>Enrolled</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(recent_enrollments || []).map((e: any, idx: number) => (
                  <tr key={idx}>
                    <td>
                      <strong>{e.user_name}</strong>
                      <small className="cell-sub">{e.user_email}</small>
                    </td>
                    <td>{e.course_title}</td>
                    <td>{new Date(e.enrolled_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/courses/${e.course_slug}`} className="btn-table-action">View course</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ConsoleSection>
    </div>
  );
};
