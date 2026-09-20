import React from 'react';
import { Link } from 'react-router-dom';
import type { QuizSummary } from '../types/index.ts';
import { useI18n } from '../i18n/index.tsx';
import { IconArrowRight } from './icons.tsx';

export const QuizCard: React.FC<{ quiz: QuizSummary }> = ({ quiz }) => {
  const { t } = useI18n();
  const isModelTest = quiz.kind === 'MODEL_TEST';

  return (
    <article className={`tta-card quiz-card ${isModelTest ? 'model-test-card' : ''}`}>
      <div className="card-body">
        <div className="card-meta">
          <span className={`badge-quiz-kind ${quiz.kind.toLowerCase()}`}>{quiz.kind.replace('_', ' ')}</span>
          {quiz.duration_minutes > 0 ? (
            <span className="card-duration">{quiz.duration_minutes}m</span>
          ) : (
            <span className="card-duration">{t('card.untimed')}</span>
          )}
        </div>

        <h3 className="card-title">
          <Link to={`/quizzes/${quiz.slug}`}>{quiz.title}</Link>
        </h3>

        <p className="card-excerpt">{quiz.description}</p>

        <div className="quiz-specs-list">
          <div className="quiz-spec">
            <span className="spec-val">{quiz.question_count || quiz.available_questions || 10}</span>
            <span className="spec-lbl">{t('card.questions')}</span>
          </div>
          <div className="quiz-spec">
            <span className="spec-val">{quiz.total_marks || 10}</span>
            <span className="spec-lbl">{t('card.marks')}</span>
          </div>
          {quiz.negative_mark > 0 && (
            <div className="quiz-spec negative-spec">
              <span className="spec-val">-{quiz.negative_mark}</span>
              <span className="spec-lbl">{t('card.perWrong')}</span>
            </div>
          )}
        </div>

        <div className="card-footer">
          <span className="card-attempts-count">
            {quiz.attempts_count > 0 ? `${quiz.attempts_count} ${t('card.attempts')}` : t('card.beFirst')}
          </span>
          <Link to={`/quizzes/${quiz.slug}`} className="card-link">
            {isModelTest ? t('card.takeModelTest') : t('card.startPractice')}
            <IconArrowRight size={15} className="card-arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
};
