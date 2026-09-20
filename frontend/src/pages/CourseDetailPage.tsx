import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { learningApi, discoveryApi } from '../api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { Course } from '../types/index.ts';
import { CourseCard } from '../components/CourseCard.tsx';
import { LoadingState, ErrorState } from '../components/States.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { useI18n } from '../i18n/index.tsx';

export const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    learningApi
      .getCourse(slug)
      .then((res) => {
        setCourse(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t('courseDetail.notFound'));
        setLoading(false);
      });
  }, [slug]);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!course) return;

    setEnrolling(true);
    try {
      await learningApi.enrollCourse(course.id);
      toast.success(t('courseDetail.enrolledToast'));
      // Refresh course data to update enrollment status
      const refreshed = await learningApi.getCourse(slug!);
      setCourse(refreshed);
    } catch (err: any) {
      toast.error(err.message || t('courseDetail.enrollFail'));
    } finally {
      setEnrolling(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!course) return;
    try {
      if (bookmarked) {
        await discoveryApi.removeBookmark('COURSE', course.id);
        setBookmarked(false);
        toast.info(t('courseDetail.unbookmarkedToast'));
      } else {
        await discoveryApi.addBookmark('COURSE', course.id);
        setBookmarked(true);
        toast.success(t('courseDetail.bookmarkedToast'));
      }
    } catch (err: any) {
      toast.error(err.message || t('courseDetail.bookmarkFail'));
    }
  };

  if (loading) return <LoadingState message={t('courseDetail.loading')} />;
  if (error || !course) return <ErrorState error={error || t('courseDetail.notFound')} onRetry={() => window.location.reload()} />;

  const isEnrolled = Boolean(course.enrollment?.enrolled);
  const progressPct = course.progress?.percentage || 0;
  const completedLessons = course.progress?.completed_lessons || 0;
  const totalLessons = course.progress?.total_lessons || 0;

  // First lesson to start/continue with
  const firstLesson = course.modules?.[0]?.lessons?.[0];

  return (
    <div className="course-detail-page">
      {/* Course Hero */}
      <section className="course-hero-section">
        <div className="course-hero-inner">
          <div className="course-hero-content">
            <div className="course-tags-row">
              <span className={`badge-difficulty ${course.difficulty?.toLowerCase()}`}>
                {course.difficulty}
              </span>
              <span className="course-section-badge">{course.section?.replace('_', ' ')}</span>
              {course.category && <span className="course-cat-badge">{course.category}</span>}
            </div>

            <h1 className="course-hero-title">{course.title}</h1>
            <p className="course-hero-lead">{course.summary}</p>

            <div className="course-info-chips">
              <div className="info-chip">
                <span className="chip-lbl">{t('courseDetail.instructor')}</span>
                <span className="chip-val">{course.instructor || t('course.faculty')}</span>
              </div>
              <div className="info-chip">
                <span className="chip-lbl">{t('courseDetail.duration')}</span>
                <span className="chip-val">⏱ {t('courseDetail.mins', { n: course.duration_minutes || 60 })}</span>
              </div>
              <div className="info-chip">
                <span className="chip-lbl">{t('courseDetail.curriculum')}</span>
                <span className="chip-val">
                  {t('courseDetail.curriculumVal', { modules: course.modules?.length || 0, lessons: totalLessons })}
                </span>
              </div>
              <div className="info-chip">
                <span className="chip-lbl">{t('courseDetail.language')}</span>
                <span className="chip-val">English / বাংলা</span>
              </div>
            </div>

            {/* Enrollment / Learning Progress Bar */}
            {isEnrolled && (
              <div className="enrolled-progress-box">
                <div className="progress-label-row">
                  <span>{t('courseDetail.progress')}</span>
                  <strong>{t('courseDetail.progressVal', { pct: progressPct, done: completedLessons, total: totalLessons })}</strong>
                </div>
                <div className="progress-track" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="course-hero-actions">
              {isEnrolled ? (
                firstLesson ? (
                  <Link to={`/lessons/${course.enrollment?.last_lesson_id || firstLesson.id}`} className="btn-primary">
                    {t('courseDetail.continue')} →
                  </Link>
                ) : (
                  <span className="enrolled-chip">✓ {t('courseDetail.enrolledChip')}</span>
                )
              ) : (
                <button onClick={handleEnroll} disabled={enrolling} className="btn-primary">
                  {enrolling ? t('courseDetail.enrolling') : t('courseDetail.enroll')}
                </button>
              )}

              <button
                onClick={handleBookmark}
                className={`btn-secondary ${bookmarked ? 'bookmarked-active' : ''}`}
                aria-label={t('courseDetail.save')}
              >
                {bookmarked ? `★ ${t('courseDetail.bookmarked')}` : `☆ ${t('courseDetail.save')}`}
              </button>
            </div>
          </div>

          <div className="course-hero-media">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt="" className="course-hero-img" />
            ) : (
              <div className="course-hero-placeholder">
                <BrandLogo className="placeholder-logo" />
                <small>{course.title}</small>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Course Content Grid */}
      <div className="course-content-layout">
        {/* Main Syllabus & Description Column */}
        <div className="course-main-col">
          {/* Overview text */}
          <section className="course-section-block">
            <h2 className="block-heading">{t('courseDetail.about')}</h2>
            <div
              className="course-rich-description"
              dangerouslySetInnerHTML={{ __html: course.body || `<p>${course.description}</p>` }}
            />
          </section>

          {/* Curriculum */}
          <section className="course-section-block">
            <div className="curriculum-header">
              <h2 className="block-heading">{t('courseDetail.syllabus')}</h2>
              <span className="curriculum-stats">
                {t('courseDetail.syllabusStats', { modules: course.modules?.length || 0, lessons: totalLessons })}
              </span>
            </div>

            <div className="syllabus-modules-list">
              {course.modules?.map((module, mIdx) => (
                <div key={module.id} className="module-card">
                  <div className="module-card-header">
                    <span className="module-number">{t('courseDetail.module', { n: mIdx + 1 })}</span>
                    <h3 className="module-title">{module.title}</h3>
                    {module.summary && <p className="module-summary">{module.summary}</p>}
                  </div>

                  <div className="module-lessons-list">
                    {module.lessons?.map((lesson, lIdx) => {
                      const canAccess = isEnrolled || lesson.is_preview;
                      return (
                        <div key={lesson.id} className={`lesson-row ${lesson.completed ? 'completed' : ''}`}>
                          <div className="lesson-left">
                            <span className="lesson-check">
                              {lesson.completed ? '✓' : `${mIdx + 1}.${lIdx + 1}`}
                            </span>
                            <div className="lesson-title-meta">
                              {canAccess ? (
                                <Link to={`/lessons/${lesson.id}`} className="lesson-link">
                                  {lesson.title}
                                </Link>
                              ) : (
                                <span className="lesson-locked-title">{lesson.title}</span>
                              )}
                              <div className="lesson-submeta">
                                <span>{lesson.kind === 'VIDEO' ? `🎥 ${t('courseDetail.video')}` : `📄 ${t('courseDetail.textLesson')}`}</span>
                                {lesson.duration_minutes > 0 && (
                                  <span>• {t('courseDetail.mins', { n: lesson.duration_minutes })}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="lesson-right">
                            {lesson.is_preview && !isEnrolled && (
                              <span className="badge-preview">{t('courseDetail.preview')}</span>
                            )}
                            {canAccess ? (
                              <Link to={`/lessons/${lesson.id}`} className="btn-table-action">
                                {lesson.completed ? t('courseDetail.review') : t('courseDetail.open')}
                              </Link>
                            ) : (
                              <span className="locked-indicator" title={t('courseDetail.lockedTitle')}>🔒 {t('courseDetail.locked')}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Course Quizzes & Tests */}
          {course.quizzes && course.quizzes.length > 0 && (
            <section className="course-section-block">
              <h2 className="block-heading">{t('courseDetail.quizzes')}</h2>
              <div className="course-quizzes-list">
                {course.quizzes.map((q) => (
                  <div key={q.id} className="course-quiz-item">
                    <div>
                      <h4>{q.title}</h4>
                      <p>{q.description}</p>
                      <small>
                        {t('courseDetail.quizMeta', { q: q.question_count, d: q.duration_minutes > 0 ? `${q.duration_minutes}m` : t('courseDetail.untimed') })}
                      </small>
                    </div>
                    <Link to={`/quizzes/${q.slug}`} className="btn-secondary">
                      {t('courseDetail.takeQuiz')} →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="course-sidebar-col">
          <div className="sidebar-card">
            <h3>{t('courseDetail.summary')}</h3>
            <ul className="sidebar-checklist">
              <li>✓ {t('courseDetail.check1')}</li>
              <li>✓ {t('courseDetail.check2')}</li>
              <li>✓ {t('courseDetail.check3')}</li>
              <li>✓ {t('courseDetail.check4')}</li>
              <li>✓ {t('courseDetail.check5')}</li>
            </ul>
          </div>

          {/* Related Courses */}
          {course.related && course.related.length > 0 && (
            <div className="sidebar-card">
              <h3>{t('courseDetail.related')}</h3>
              <div className="sidebar-related-list">
                {course.related.map((rel) => (
                  <Link to={`/courses/${rel.slug}`} key={rel.id} className="sidebar-related-item">
                    <strong>{rel.title}</strong>
                    <span>{rel.difficulty} • {rel.section?.replace('_', ' ')}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
