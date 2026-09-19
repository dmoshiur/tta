import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizApi } from '../api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { Question, QuizSummary } from '../types/index.ts';
import { LoadingState, ErrorState } from '../components/States.tsx';

export const QuizTakePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizSummary | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Countdown timer in seconds
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Require login to take quiz
  useEffect(() => {
    if (!user) {
      toast.info('Sign in to begin your examination and track results.');
      navigate(`/login?redirect=/quizzes/${slug}`);
    }
  }, [user, slug, navigate, toast]);

  // Start attempt on mount
  useEffect(() => {
    if (!slug || !user) return;
    setLoading(true);

    quizApi
      .startQuiz(slug)
      .then((res) => {
        setQuiz(res.quiz);
        setQuestions(res.questions);
        setAttemptId(res.attempt_id);
        setAnswers(res.saved_answers || {});
        if (res.seconds_remaining !== null) {
          setSecondsLeft(res.seconds_remaining);
        }
        setLoading(false);
        if (res.resumed) {
          toast.info('Resumed previous in-progress examination session.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Could not start examination.');
        setLoading(false);
      });
  }, [slug, user, toast]);

  // Submission handler
  const handleSubmit = useCallback(async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    setShowConfirmModal(false);

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await quizApi.submitAttempt(attemptId, answers);
      toast.success('Examination submitted successfully!');
      navigate(`/quiz-results/${res.attempt_id || res.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  }, [attemptId, answers, submitting, navigate, toast]);

  // Auto-submit when timer expires
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      toast.info('Time has expired! Submitting your examination…');
      handleSubmit();
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [secondsLeft, handleSubmit, toast]);

  // Auto-save answers to server when updated
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleAnswerSelect = (questionId: string, optionIndex: number, isMultiple: boolean) => {
    setAnswers((prev) => {
      let updated: any;
      if (isMultiple) {
        const currentList: number[] = Array.isArray(prev[questionId]) ? prev[questionId] : [];
        if (currentList.includes(optionIndex)) {
          updated = currentList.filter((idx) => idx !== optionIndex);
        } else {
          updated = [...currentList, optionIndex].sort((a, b) => a - b);
        }
      } else {
        updated = optionIndex;
      }
      const nextAnswers = { ...prev, [questionId]: updated };

      // Debounce autosave
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        if (attemptId) {
          quizApi.saveAnswers(attemptId, nextAnswers).catch(() => {});
        }
      }, 1000);

      return nextAnswers;
    });
  };

  const handleClearAnswer = (questionId: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      if (attemptId) {
        quizApi.saveAnswers(attemptId, next).catch(() => {});
      }
      return next;
    });
  };

  if (loading) return <LoadingState message="Setting up your examination session…" />;
  if (error || !quiz || questions.length === 0)
    return <ErrorState error={error || 'No questions available.'} onRetry={() => window.location.reload()} />;

  const currentQ = questions[currentIndex];
  const isMultiple = currentQ.kind === 'MULTIPLE';
  const selectedAnswer = answers[currentQ.id];

  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== null).length;
  const unansweredCount = questions.length - answeredCount;

  // Format time mm:ss
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="quiz-take-screen">
      {/* Top Test Header */}
      <header className="test-top-header">
        <div className="test-header-left">
          <span className="test-kind-badge">{quiz.kind.replace('_', ' ')}</span>
          <h1 className="test-header-title">{quiz.title}</h1>
        </div>

        <div className="test-header-right">
          {secondsLeft !== null && (
            <div className={`countdown-clock ${secondsLeft < 300 ? 'urgent' : ''}`}>
              <span className="clock-icon">⏱</span>
              <strong className="clock-digits">{formatTimer(secondsLeft)}</strong>
            </div>
          )}

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={submitting}
            className="btn-submit-exam"
          >
            {submitting ? 'Submitting…' : 'Submit Examination'}
          </button>
        </div>
      </header>

      {/* Main Testing View */}
      <div className="test-main-layout">
        {/* Left Column: Active Question */}
        <div className="test-question-canvas">
          <div className="question-header-row">
            <span className="q-number-pill">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="q-marks-pill">+{currentQ.marks} mark{currentQ.marks > 1 ? 's' : ''}</span>
            {quiz.negative_mark > 0 && (
              <span className="q-neg-pill">(-{quiz.negative_mark} on wrong)</span>
            )}
          </div>

          <div className="question-prompt-box">
            <h2 className="question-prompt-text">{currentQ.prompt}</h2>
            {isMultiple && (
              <p className="multiple-instruct">
                (Multiple options may be correct — select all that apply)
              </p>
            )}
          </div>

          {/* Options List */}
          <div className="options-stack" role="radiogroup" aria-label="Question options">
            {currentQ.options.map((opt, oIdx) => {
              const isChecked = isMultiple
                ? Array.isArray(selectedAnswer) && selectedAnswer.includes(oIdx)
                : selectedAnswer === oIdx;

              return (
                <div
                  key={oIdx}
                  onClick={() => handleAnswerSelect(currentQ.id, oIdx, isMultiple)}
                  className={`option-row-card ${isChecked ? 'selected' : ''}`}
                  role={isMultiple ? 'checkbox' : 'radio'}
                  aria-checked={isChecked}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleAnswerSelect(currentQ.id, oIdx, isMultiple);
                    }
                  }}
                >
                  <span className="opt-letter">
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span className="opt-text">{opt}</span>
                  <span className="opt-check-indicator">
                    {isChecked ? '●' : '○'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom Question Controls */}
          <div className="question-bottom-nav">
            <div className="left-controls">
              {selectedAnswer !== undefined && (
                <button
                  onClick={() => handleClearAnswer(currentQ.id)}
                  className="btn-clear-answer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="nav-step-buttons">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="btn-secondary-sm"
              >
                ← Previous
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="btn-primary-sm"
                >
                  Next Question →
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="btn-primary-sm"
                >
                  Review & Submit →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Question Navigator Palette */}
        <aside className="test-palette-aside">
          <div className="palette-stats-card">
            <h3>Question Status</h3>
            <div className="palette-counters">
              <div className="counter-item answered">
                <strong>{answeredCount}</strong>
                <span>Answered</span>
              </div>
              <div className="counter-item unanswered">
                <strong>{unansweredCount}</strong>
                <span>Unanswered</span>
              </div>
            </div>
          </div>

          <div className="palette-grid-card">
            <h4>Jump to Question</h4>
            <div className="palette-grid">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null;
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`palette-num-btn ${isAnswered ? 'answered' : ''} ${isCurrent ? 'current' : ''}`}
                    aria-label={`Question ${idx + 1} ${isAnswered ? 'answered' : 'unanswered'}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="palette-info-card">
            <p className="info-text">
              Answers are automatically saved. You can freely change your answers before final submission.
            </p>
          </div>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Ready to Submit?</h3>
            <p className="modal-desc">
              You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
              {unansweredCount > 0 && (
                <span className="modal-warn-text">
                  <br />⚠ You still have <strong>{unansweredCount}</strong> unanswered questions.
                </span>
              )}
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary"
              >
                Back to Questions
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? 'Submitting…' : 'Yes, Final Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
