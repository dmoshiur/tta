import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { learningApi, discoveryApi } from '../api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { LessonDetail } from '../types/index.ts';
import { LoadingState, ErrorState } from '../components/States.tsx';

export const LessonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
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
        setError(err.message || 'Lesson not accessible.');
        setLoading(false);
      });
  }, [id]);

  const handleToggleComplete = async () => {
    if (!user) {
      toast.info('Sign in to save your learning progress.');
      return;
    }
    if (!lesson) return;

    setCompleting(true);
    try {
      if (lesson.completed) {
        await learningApi.uncompleteLesson(lesson.id);
        setLesson((prev) => (prev ? { ...prev, completed: false } : null));
        toast.info('Marked as incomplete');
      } else {
        const res = await learningApi.completeLesson(lesson.id);
        setLesson((prev) => (prev ? { ...prev, completed: true } : null));
        toast.success(res.courseCompleted ? '🎉 Congratulations! You completed the course!' : '✓ Lesson completed!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not update progress.');
    } finally {
      setCompleting(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.info('Sign in to save bookmarks.');
      return;
    }
    if (!lesson) return;
    try {
      if (bookmarked) {
        await discoveryApi.removeBookmark('LESSON', lesson.id);
        setBookmarked(false);
        toast.info('Removed from bookmarks');
      } else {
        await discoveryApi.addBookmark('LESSON', lesson.id);
        setBookmarked(true);
        toast.success('Lesson bookmarked');
      }
    } catch (err: any) {
      toast.error(err.message || 'Bookmark action failed.');
    }
  };

  if (loading) return <LoadingState message="Loading lesson materials…" />;
  if (error || !lesson) return <ErrorState error={error || 'Lesson not found.'} onRetry={() => window.location.reload()} />;

  return (
    <div className="lesson-view-page">
      {/* Top Breadcrumb & Status Bar */}
      <div className="lesson-top-bar">
        <div className="lesson-breadcrumbs">
          <Link to="/courses">Courses</Link>
          <span>/</span>
          <Link to={`/courses/${lesson.course.slug}`}>{lesson.course.title}</Link>
          <span>/</span>
          <span className="current-crumb">{lesson.title}</span>
        </div>

        <div className="lesson-top-actions">
          <button
            onClick={handleBookmark}
            className={`btn-icon-action ${bookmarked ? 'active' : ''}`}
            aria-label="Save bookmark"
            title="Bookmark lesson"
          >
            {bookmarked ? '★' : '☆'}
          </button>
          <Link to={`/courses/${lesson.course.slug}`} className="btn-secondary-sm">
            ← Curriculum
          </Link>
        </div>
      </div>

      {/* Lesson Reader Canvas */}
      <div className="lesson-container">
        <header className="lesson-header">
          <span className="lesson-module-tag">{lesson.module.title}</span>
          <h1 className="lesson-headline">{lesson.title}</h1>
          <div className="lesson-meta-row">
            <span>⏱ {lesson.duration_minutes || 10} minutes</span>
            {lesson.completed && <span className="lesson-completed-badge">✓ Completed</span>}
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
            <h3>Lesson Notes & References</h3>
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
              {completing ? 'Updating…' : lesson.completed ? '✓ Completed (Click to Undo)' : 'Mark as Complete'}
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
                Finish Course Overview →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
