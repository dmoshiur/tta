import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { quizApi } from '../api.ts';
import type { AttemptDetail } from '../types/index.ts';
import { LoadingState, ErrorState } from '../components/States.tsx';

export const QuizResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
        setError(err.message || 'Attempt details not found.');
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingState message="Calculating examination score and review…" />;
  if (error || !attempt) return <ErrorState error={error || 'Result not found.'} onRetry={() => window.location.reload()} />;

  const isPassed = attempt.passed;
  const timeMin = attempt.seconds_spent ? Math.round(attempt.seconds_spent / 60) : 0;

  return (
    <div className="quiz-result-page">
      {/* Result Score Banner */}
      <div className={`result-score-hero ${isPassed ? 'passed-hero' : 'failed-hero'}`}>
        <div className="result-hero-inner">
          <span className="result-tagline">{attempt.quiz_kind?.replace('_', ' ') || 'EXAMINATION'} RESULT</span>
          <h1 className="result-quiz-title">{attempt.quiz_title}</h1>

          <div className="score-circle-badge">
            <strong className="score-number">{attempt.score}</strong>
            <span className="score-divider">out of {attempt.total}</span>
            <span className="score-pct">{attempt.percentage}%</span>
          </div>

          <div className="pass-status-pill">
            {isPassed ? '✓ PASSED' : '✕ NEEDS IMPROVEMENT'}
          </div>

          <p className="result-submitted-time">
            Submitted {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : ''}
            {timeMin > 0 && ` • Completed in ~${timeMin} mins`}
          </p>

          <div className="result-action-buttons">
            {attempt.quiz_slug && (
              <Link to={`/quizzes/${attempt.quiz_slug}`} className="btn-primary">
                Retake Examination ↻
              </Link>
            )}
            <Link to="/quizzes" className="btn-secondary">
              Browse More Quizzes
            </Link>
            <Link to="/dashboard" className="btn-secondary">
              View Dashboard Hub
            </Link>
          </div>
        </div>
      </div>

      {/* Numerical Metrics Cards */}
      <div className="result-stats-row">
        <div className="result-stat-card correct">
          <span className="stat-symbol">✓</span>
          <strong>{attempt.correct_count}</strong>
          <span>Correct Answers</span>
        </div>

        <div className="result-stat-card wrong">
          <span className="stat-symbol">✕</span>
          <strong>{attempt.wrong_count}</strong>
          <span>Wrong Answers</span>
        </div>

        <div className="result-stat-card unanswered">
          <span className="stat-symbol">○</span>
          <strong>{attempt.unanswered_count}</strong>
          <span>Unanswered</span>
        </div>

        <div className="result-stat-card total">
          <span className="stat-symbol">⏱</span>
          <strong>{timeMin}m</strong>
          <span>Time Taken</span>
        </div>
      </div>

      {/* Question by Question Educational Review */}
      <section className="result-review-section">
        <div className="review-header">
          <h2>Detailed Answer Review & Explanations</h2>
          <p>
            Study each question, your submitted response, the verified correct answer, and the complete reasoning.
          </p>
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
                  <span className="q-index-pill">Question {idx + 1}</span>
                  <span className={`q-status-badge ${isCorrect ? 'badge-correct' : isSkipped ? 'badge-skipped' : 'badge-wrong'}`}>
                    {isCorrect ? '✓ Correct (+marks)' : isSkipped ? '○ Unanswered' : '✕ Wrong'}
                  </span>
                  <span className="q-awarded-text">Score: {q.awarded > 0 ? `+${q.awarded}` : q.awarded}</span>
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
                        {isCorrectAnswer && <span className="opt-badge-tag correct-tag">Correct Answer</span>}
                        {isUserPick && !isCorrectAnswer && (
                          <span className="opt-badge-tag wrong-tag">Your Selection</span>
                        )}
                        {isUserPick && isCorrectAnswer && (
                          <span className="opt-badge-tag user-correct-tag">Your Answer ✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation text */}
                {q.explanation && (
                  <div className="review-explanation-box">
                    <strong>Explanation:</strong>
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
