import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { quizApi } from '../api.ts';
import type { AttemptDetail } from '../types/index.ts';
import { LoadingState, ErrorState } from '../components/States.tsx';
import { useI18n } from '../i18n/index.tsx';

export const QuizResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    quizApi
      .getAttempt(id)
      .then((res) => {
        setAttempt(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t('quizResult.notFound'));
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingState message={t('quizResult.loading')} />;
  if (error || !attempt) return <ErrorState error={error || t('quizResult.notFound')} onRetry={() => window.location.reload()} />;

  const isPassed = attempt.passed;
  const timeMin = attempt.seconds_spent ? Math.round(attempt.seconds_spent / 60) : 0;

  return (
    <div className="quiz-result-page">
      {/* Result Score Banner */}
      <div className={`result-score-hero ${isPassed ? 'passed-hero' : 'failed-hero'}`}>
        <div className="result-hero-inner">
          <span className="result-tagline">{t('quizResult.tagline', { kind: attempt.quiz_kind?.replace('_', ' ') || t('quizResult.examination') })}</span>
          <h1 className="result-quiz-title">{attempt.quiz_title}</h1>

          <div className="score-circle-badge">
            <strong className="score-number">{attempt.score}</strong>
            <span className="score-divider">{t('quizResult.outOf', { total: attempt.total })}</span>
            <span className="score-pct">{attempt.percentage}%</span>
          </div>

          <div className="pass-status-pill">
            {isPassed ? `✓ ${t('quizResult.passed')}` : `✕ ${t('quizResult.needsWork')}`}
          </div>

          <p className="result-submitted-time">
            {t('quizResult.submittedAt', { time: attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : '' })}
            {timeMin > 0 && ` • ${t('quizResult.completedIn', { n: timeMin })}`}
          </p>

          <div className="result-action-buttons">
            {attempt.quiz_slug && (
              <Link to={`/quizzes/${attempt.quiz_slug}`} className="btn-primary">
                {t('quizResult.retake')} ↻
              </Link>
            )}
            <Link to="/quizzes" className="btn-secondary">
              {t('quizResult.browseMore')}
            </Link>
            <Link to="/dashboard" className="btn-secondary">
              {t('quizResult.viewDashboard')}
            </Link>
          </div>
        </div>
      </div>

      {/* Numerical Metrics Cards */}
      <div className="result-stats-row">
        <div className="result-stat-card correct">
          <span className="stat-symbol">✓</span>
          <strong>{attempt.correct_count}</strong>
          <span>{t('quizResult.correctAnswers')}</span>
        </div>

        <div className="result-stat-card wrong">
          <span className="stat-symbol">✕</span>
          <strong>{attempt.wrong_count}</strong>
          <span>{t('quizResult.wrongAnswers')}</span>
        </div>

        <div className="result-stat-card unanswered">
          <span className="stat-symbol">○</span>
          <strong>{attempt.unanswered_count}</strong>
          <span>{t('quizResult.unanswered')}</span>
        </div>

        <div className="result-stat-card total">
          <span className="stat-symbol">⏱</span>
          <strong>{timeMin}m</strong>
          <span>{t('quizResult.timeTaken')}</span>
        </div>
      </div>

      {/* Question by Question Educational Review */}
      <section className="result-review-section">
        <div className="review-header">
          <h2>{t('quizResult.reviewHeading')}</h2>
          <p>{t('quizResult.reviewLead')}</p>
        </div>

        <div className="review-questions-list">
          {attempt.review?.map((q, idx) => {
            const isCorrect = q.is_correct;
            const isSkipped = q.your_answer === null;

            return (
              <div
                key={q.id || idx}
                className={`review-card ${isCorrect ? 'is-correct' : isSkipped ? 'is-skipped' : 'is-wrong'}`}
              >
                <div className="review-card-header">
                  <span className="q-index-pill">{t('quizResult.questionN', { n: idx + 1 })}</span>
                  <span className={`q-status-badge ${isCorrect ? 'badge-correct' : isSkipped ? 'badge-skipped' : 'badge-wrong'}`}>
                    {isCorrect ? `✓ ${t('quizResult.correctPill')}` : isSkipped ? `○ ${t('quizResult.unanswered')}` : `✕ ${t('quizResult.wrongPill')}`}
                  </span>
                  <span className="q-awarded-text">{t('quizResult.scoreLabel')} {q.awarded > 0 ? `+${q.awarded}` : q.awarded}</span>
                </div>

                <h3 className="review-prompt">{q.prompt}</h3>

                {/* Options list showing user choice & correct answer */}
                <div className="review-options-list">
                  {q.options?.map((opt, oIdx) => {
                    const isUserPick = Array.isArray(q.your_answer)
                      ? q.your_answer.includes(oIdx)
                      : q.your_answer === oIdx;
                    const isCorrectAnswer = Array.isArray(q.correct_answer)
                      ? q.correct_answer.includes(oIdx)
                      : q.correct_answer === oIdx;

                    let optClass = 'review-option';
                    if (isCorrectAnswer) optClass += ' correct-opt';
                    if (isUserPick && !isCorrectAnswer) optClass += ' wrong-user-opt';

                    return (
                      <div key={oIdx} className={optClass}>
                        <span className="opt-letter">{String.fromCharCode(65 + oIdx)}</span>
                        <span className="opt-label-text">{opt}</span>
                        {isCorrectAnswer && <span className="opt-badge-tag correct-tag">{t('quizResult.correctAnswer')}</span>}
                        {isUserPick && !isCorrectAnswer && (
                          <span className="opt-badge-tag wrong-tag">{t('quizResult.yourSelection')}</span>
                        )}
                        {isUserPick && isCorrectAnswer && (
                          <span className="opt-badge-tag user-correct-tag">{t('quizResult.yourAnswerOk')} ✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation text */}
                {q.explanation && (
                  <div className="review-explanation-box">
                    <strong>{t('quizResult.explanation')}</strong>
                    <p>{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
