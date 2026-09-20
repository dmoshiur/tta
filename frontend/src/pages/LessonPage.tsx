import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { learningApi, discoveryApi } from '../api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { LessonDetail } from '../types/index.ts';
import { LoadingState, ErrorState } from '../components/States.tsx';
import { useI18n } from '../i18n/index.tsx';

export const LessonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    learningApi
      .getLesson(id)
      .then((res) => {
        setLesson(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t('lesson.notAccessible'));
        setLoading(false);
      });
  }, [id]);

  const handleToggleComplete = async () => {
    if (!user) {
      toast.info(t('lesson.signInProgress'));
      return;
    }
    if (!lesson) return;

    setCompleting(true);
    try {
      if (lesson.completed) {
        await learningApi.uncompleteLesson(lesson.id);
        setLesson((prev) => (prev ? { ...prev, completed: false } : null));
        toast.info(t('lesson.markedIncomplete'));
      } else {
        const res = await learningApi.completeLesson(lesson.id);
        setLesson((prev) => (prev ? { ...prev, completed: true } : null));
        toast.success(res.courseCompleted ? `🎉 ${t('lesson.courseCompleteToast')}` : `✓ ${t('lesson.lessonCompleteToast')}`);
      }
    } catch (err: any) {
      toast.error(err.message || t('lesson.progressFail'));
    } finally {
      setCompleting(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.info(t('lesson.signInBookmark'));
      return;
    }
    if (!lesson) return;
    try {
      if (bookmarked) {
        await discoveryApi.removeBookmark('LESSON', lesson.id);
        setBookmarked(false);
        toast.info(t('courseDetail.unbookmarkedToast'));
      } else {
        await discoveryApi.addBookmark('LESSON', lesson.id);
        setBookmarked(true);
        toast.success(t('lesson.bookmarkedToast'));
      }
    } catch (err: any) {
      toast.error(err.message || t('courseDetail.bookmarkFail'));
    }
  };

  if (loading) return <LoadingState message={t('lesson.loading')} />;
  if (error || !lesson) return <ErrorState error={error || t('lesson.notFound')} onRetry={() => window.location.reload()} />;

  return (
    <div className="lesson-view-page">
      {/* Top Breadcrumb & Status Bar */}
      <div className="lesson-top-bar">
        <div className="lesson-breadcrumbs">
          <Link to="/courses">{t('nav.courses')}</Link>
          <span>/</span>
          <Link to={`/courses/${lesson.course.slug}`}>{lesson.course.title}</Link>
          <span>/</span>
          <span className="current-crumb">{lesson.title}</span>
        </div>

        <div className="lesson-top-actions">
          <button
            onClick={handleBookmark}
            className={`btn-icon-action ${bookmarked ? 'active' : ''}`}
            aria-label={t('lesson.bookmarkTitle')}
            title={t('lesson.bookmarkTitle')}
          >
            {bookmarked ? '★' : '☆'}
          </button>
          <Link to={`/courses/${lesson.course.slug}`} className="btn-secondary-sm">
            ← {t('lesson.curriculum')}
          </Link>
        </div>
      </div>

      {/* Lesson Reader Canvas */}
      <div className="lesson-container">
        <header className="lesson-header">
          <span className="lesson-module-tag">{lesson.module.title}</span>
          <h1 className="lesson-headline">{lesson.title}</h1>
          <div className="lesson-meta-row">
            <span>⏱ {t('lesson.minutes', { n: lesson.duration_minutes || 10 })}</span>
            {lesson.completed && <span className="lesson-completed-badge">✓ {t('lesson.completed')}</span>}
          </div>
        </header>

        {/* Video Player if video kind */}
        {lesson.video_url && (
          <div className="lesson-video-wrapper">
            {lesson.video_url.includes('youtube.com') || lesson.video_url.includes('youtu.be') ? (
              <iframe
                src={lesson.video_url.replace('watch?v=', 'embed/')}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="lesson-iframe"
              />
            ) : (
              <video src={lesson.video_url} controls className="lesson-video-player" />
            )}
          </div>
        )}

        {/* Rich Text Content */}
        <article
          className="lesson-article-body"
          dangerouslySetInnerHTML={{ __html: lesson.content || `<p>${lesson.summary}</p>` }}
        />

        {/* Notes & Downloads if present */}
        {(lesson.notes || (lesson.attachments && lesson.attachments.length > 0)) && (
          <div className="lesson-resources-box">
            <h3>{t('lesson.notes')}</h3>
            {lesson.notes && (
              <div
                className="lesson-notes-content"
                dangerouslySetInnerHTML={{ __html: lesson.notes }}
              />
            )}
            {lesson.attachments && lesson.attachments.length > 0 && (
              <ul className="attachment-links-list">
                {lesson.attachments.map((att, idx) => (
                  <li key={idx}>
                    <a href={att.url} target="_blank" rel="noopener noreferrer">
                      📎 {att.title} ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Completion & Next/Prev Controls */}
        <div className="lesson-footer-controls">
          <div className="completion-toggle-wrap">
            <button
              onClick={handleToggleComplete}
              disabled={completing}
              className={`btn-complete-lesson ${lesson.completed ? 'is-completed' : ''}`}
            >
              {completing ? t('lesson.updating') : lesson.completed ? `✓ ${t('lesson.completedUndo')}` : t('lesson.markComplete')}
            </button>
          </div>

          <div className="lesson-nav-buttons">
            {lesson.navigation.previous ? (
              <Link to={`/lessons/${lesson.navigation.previous.id}`} className="btn-secondary nav-btn">
                ← {lesson.navigation.previous.title}
              </Link>
            ) : (
              <div />
            )}

            {lesson.navigation.next ? (
              <Link to={`/lessons/${lesson.navigation.next.id}`} className="btn-primary nav-btn">
                {lesson.navigation.next.title} →
              </Link>
            ) : (
              <Link to={`/courses/${lesson.course.slug}`} className="btn-primary nav-btn">
                {t('lesson.finishCourse')} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
