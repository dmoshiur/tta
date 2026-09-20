import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizApi } from '../api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { Question, QuizSummary } from '../types/index.ts';
import { LoadingState, ErrorState } from '../components/States.tsx';
import { useI18n } from '../i18n/index.tsx';

export const QuizTakePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useI18n();

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
      toast.info(t('quizTake.signInHint'));
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
          toast.info(t('quizTake.resumed'));
        }
      })
      .catch((err) => {
        setError(err.message || t('quizTake.startFail'));
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
      toast.success(t('quizTake.submitted'));
      navigate(`/quiz-results/${res.attempt_id || res.id}`);
    } catch (err: any) {
      toast.error(err.message || t('quizTake.submitFail'));
      setSubmitting(false);
    }
  }, [attemptId, answers, submitting, navigate, toast]);

  // Auto-submit when timer expires
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      toast.info(t('quizTake.timeExpired'));
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

  if (loading) return <LoadingState message={t('quizTake.loading')} />;
  if (error || !quiz || questions.length === 0)
    return <ErrorState error={error || t('quizTake.noQuestions')} onRetry={() => window.location.reload()} />;

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
            {submitting ? t('quizTake.submitting') : t('quizTake.submitExam')}
          </button>
        </div>
      </header>

      {/* Main Testing View */}
      <div className="test-main-layout">
        {/* Left Column: Active Question */}
        <div className="test-question-canvas">
          <div className="question-header-row">
            <span className="q-number-pill">
              {t('quizTake.questionOf', { n: currentIndex + 1, total: questions.length })}
            </span>
            <span className="q-marks-pill">{t('quizTake.marks', { n: currentQ.marks })}</span>
            {quiz.negative_mark > 0 && (
              <span className="q-neg-pill">{t('quizTake.negative', { n: quiz.negative_mark })}</span>
            )}
          </div>

          <div className="question-prompt-box">
            <h2 className="question-prompt-text">{currentQ.prompt}</h2>
            {isMultiple && (
              <p className="multiple-instruct">
                {t('quizTake.multipleHint')}
              </p>
            )}
          </div>

          {/* Options List */}
          <div className="options-stack" role="radiogroup" aria-label={t('quizTake.optionsLabel')}>
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
                  {t('quizTake.clear')}
                </button>
              )}
            </div>

            <div className="nav-step-buttons">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="btn-secondary-sm"
              >
                ← {t('quizTake.prev')}
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="btn-primary-sm"
                >
                  {t('quizTake.next')} →
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="btn-primary-sm"
                >
                  {t('quizTake.reviewSubmit')} →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Question Navigator Palette */}
        <aside className="test-palette-aside">
          <div className="palette-stats-card">
            <h3>{t('quizTake.statusHeading')}</h3>
            <div className="palette-counters">
              <div className="counter-item answered">
                <strong>{answeredCount}</strong>
                <span>{t('quizTake.answered')}</span>
              </div>
              <div className="counter-item unanswered">
                <strong>{unansweredCount}</strong>
                <span>{t('quizTake.unanswered')}</span>
              </div>
            </div>
          </div>

          <div className="palette-grid-card">
            <h4>{t('quizTake.jumpTo')}</h4>
            <div className="palette-grid">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null;
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`palette-num-btn ${isAnswered ? 'answered' : ''} ${isCurrent ? 'current' : ''}`}
                    aria-label={t('quizTake.paletteLabel', { n: idx + 1, state: isAnswered ? t('quizTake.answered') : t('quizTake.unanswered') })}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="palette-info-card">
            <p className="info-text">
              {t('quizTake.autosaveNote')}
            </p>
          </div>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{t('quizTake.confirmTitle')}</h3>
            <p className="modal-desc">
              {t('quizTake.confirmBody', { answered: answeredCount, total: questions.length })}
              {unansweredCount > 0 && (
                <span className="modal-warn-text">
                  <br />⚠ {t('quizTake.confirmWarn', { n: unansweredCount })}
                </span>
              )}
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary"
              >
                {t('quizTake.backToQuestions')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? t('quizTake.submitting') : t('quizTake.finalSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
