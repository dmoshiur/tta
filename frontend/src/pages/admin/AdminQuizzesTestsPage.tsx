import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api.ts';
import { LoadingState, ErrorState } from '../../components/States.tsx';
import { ConsoleHeader, ConsoleSection, MetricCard } from '../../components/admin/AdminBits.tsx';

/* Quizzes & Tests — assessment operations hub: quizzes, question bank and attempts. */

export const AdminQuizzesTestsPage: React.FC = () => {
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
        setError(err.message || 'Failed to load assessment data.');
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingState message="Loading assessments…" />;
  if (error || !data) return <ErrorState error={error || 'Failed to load assessment data.'} onRetry={() => window.location.reload()} />;

  const { stats, recent_attempts } = data;
  const recentPassRate = recent_attempts?.length
    ? Math.round((recent_attempts.filter((a: any) => a.passed).length / recent_attempts.length) * 100)
    : null;

  return (
    <div className="page-container admin-hub-page">
      <ConsoleHeader
        title="Quizzes & Tests"
        desc="Build examination sets, maintain the MCQ question bank and review learner submissions."
      >
        <Link to="/admin/r/quizzes/new" className="btn-primary-sm">+ New Quiz</Link>
        <Link to="/admin/r/questions/new" className="btn-secondary-sm">+ New Question</Link>
      </ConsoleHeader>

      <div className="sa-metrics-grid">
        <MetricCard label="Quizzes & Model Tests" value={stats.quizzes} hint="All kinds" linkTo="/admin/r/quizzes" />
        <MetricCard label="Question Bank" value={stats.questions} hint="Reusable MCQ items" linkTo="/admin/r/questions" />
        <MetricCard label="Submissions" value={stats.attempts} hint="Attempt history" linkTo="/admin/r/attempts" tone="info" />
        <MetricCard
          label="Recent Pass Rate"
          value={recentPassRate === null ? '—' : `${recentPassRate}%`}
          tone={recentPassRate === null ? 'default' : recentPassRate >= 60 ? 'good' : 'warn'}
          hint="Across latest submissions"
        />
      </div>

      <ConsoleSection title="Assessment Management">
        <div className="admin-resource-cards">
          <div className="res-nav-card">
            <h3>✍️ Examination Sets</h3>
            <ul>
              <li><Link to="/admin/r/quizzes">Quizzes, MCQ sets & model tests ({stats.quizzes})</Link></li>
              <li><Link to="/admin/r/questions">Question bank ({stats.questions})</Link></li>
              <li><Link to="/admin/r/attempts">Attempt history ({stats.attempts})</Link></li>
            </ul>
          </div>
          <div className="res-nav-card">
            <h3>🎯 Exam Logic</h3>
            <ul>
              <li>Negative marking per question</li>
              <li>Timed model tests & question draws</li>
              <li>Shuffling and attempt limits</li>
              <li>Explanations after submission</li>
            </ul>
          </div>
        </div>
      </ConsoleSection>

      <ConsoleSection title="Recent Submissions" tag={`${recent_attempts?.length || 0} latest`}>
        <div className="admin-table-panel full-width">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Assessment</th>
                  <th>Score</th>
                  <th>Result</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {(recent_attempts || []).map((a: any, idx: number) => (
                  <tr key={idx}>
                    <td><strong>{a.learner}</strong></td>
                    <td>{a.quiz_title}</td>
                    <td>{a.score} / {a.total} ({a.percentage}%)</td>
                    <td>
                      <span className={`score-badge ${a.passed ? 'pass' : 'fail'}`}>{a.passed ? 'Passed' : 'Failed'}</span>
                    </td>
                    <td>{new Date(a.submitted_at).toLocaleDateString()}</td>
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
