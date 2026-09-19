import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { learningApi, discoveryApi } from '../api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { Course } from '../types/index.ts';
import { CourseCard } from '../components/CourseCard.tsx';
import { LoadingState, ErrorState } from '../components/States.tsx';

export const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
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
        setError(err.message || 'Course not found.');
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
      toast.success('You have successfully enrolled in this course!');
      // Refresh course data to update enrollment status
      const refreshed = await learningApi.getCourse(slug!);
      setCourse(refreshed);
    } catch (err: any) {
      toast.error(err.message || 'Enrollment failed.');
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
        toast.info('Removed from bookmarks');
      } else {
        await discoveryApi.addBookmark('COURSE', course.id);
        setBookmarked(true);
        toast.success('Course bookmarked');
      }
    } catch (err: any) {
      toast.error(err.message || 'Bookmark action failed.');
    }
  };

  if (loading) return <LoadingState message="Loading course curriculum…" />;
  if (error || !course) return <ErrorState error={error || 'Course not found.'} onRetry={() => window.location.reload()} />;

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
                <span className="chip-lbl">Instructor</span>
                <span className="chip-val">{course.instructor || 'ThinkTank Faculty'}</span>
              </div>
              <div className="info-chip">
                <span className="chip-lbl">Duration</span>
                <span className="chip-val">⏱ {course.duration_minutes || 60} mins</span>
              </div>
              <div className="info-chip">
                <span className="chip-lbl">Curriculum</span>
                <span className="chip-val">
                  {course.modules?.length || 0} modules • {totalLessons} lessons
                </span>
              </div>
              <div className="info-chip">
                <span className="chip-lbl">Language</span>
                <span className="chip-val">English</span>
              </div>
            </div>

            {/* Enrollment / Learning Progress Bar */}
            {isEnrolled && (
              <div className="enrolled-progress-box">
                <div className="progress-label-row">
                  <span>Your Learning Progress</span>
                  <strong>{progressPct}% Completed ({completedLessons}/{totalLessons} lessons)</strong>
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
                    Continue Learning →
                  </Link>
                ) : (
                  <span className="enrolled-chip">✓ Enrolled</span>
                )
              ) : (
                <button onClick={handleEnroll} disabled={enrolling} className="btn-primary">
                  {enrolling ? 'Enrolling…' : 'Enroll in Course (Free)'}
                </button>
              )}

              <button
                onClick={handleBookmark}
                className={`btn-secondary ${bookmarked ? 'bookmarked-active' : ''}`}
                aria-label="Bookmark course"
              >
                {bookmarked ? '★ Bookmarked' : '☆ Save Course'}
              </button>
            </div>
          </div>

          <div className="course-hero-media">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt="" className="course-hero-img" />
            ) : (
              <div className="course-hero-placeholder">
                <span className="placeholder-logo">TT</span>
                <p>ThinkTank Academia</p>
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
            <h2 className="block-heading">About This Course</h2>
            <div
              className="course-rich-description"
              dangerouslySetInnerHTML={{ __html: course.body || `<p>${course.description}</p>` }}
            />
          </section>

          {/* Curriculum */}
          <section className="course-section-block">
            <div className="curriculum-header">
              <h2 className="block-heading">Course Syllabus</h2>
              <span className="curriculum-stats">
                {course.modules?.length || 0} Modules • {totalLessons} Lessons
              </span>
            </div>

            <div className="syllabus-modules-list">
              {course.modules?.map((module, mIdx) => (
                <div key={module.id} className="module-card">
                  <div className="module-card-header">
                    <span className="module-number">Module {mIdx + 1}</span>
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
                                <span>{lesson.kind === 'VIDEO' ? '🎥 Video' : '📄 Text Lesson'}</span>
                                {lesson.duration_minutes > 0 && (
                                  <span>• {lesson.duration_minutes} mins</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="lesson-right">
                            {lesson.is_preview && !isEnrolled && (
                              <span className="badge-preview">Free Preview</span>
                            )}
                            {canAccess ? (
                              <Link to={`/lessons/${lesson.id}`} className="btn-table-action">
                                {lesson.completed ? 'Review' : 'Open →'}
                              </Link>
                            ) : (
                              <span className="locked-indicator" title="Enroll to unlock">
                                🔒 Locked
                              </span>
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
              <h2 className="block-heading">Quizzes & Assessments</h2>
              <div className="course-quizzes-list">
                {course.quizzes.map((q) => (
                  <div key={q.id} className="course-quiz-item">
                    <div>
                      <h4>{q.title}</h4>
                      <p>{q.description}</p>
                      <small>
                        {q.question_count} questions • {q.duration_minutes > 0 ? `${q.duration_minutes}m` : 'Untimed'}
                      </small>
                    </div>
                    <Link to={`/quizzes/${q.slug}`} className="btn-secondary">
                      Take Quiz →
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
            <h3>Course Summary</h3>
            <ul className="sidebar-checklist">
              <li>✓ Self-paced structured learning</li>
              <li>✓ Modular lessons with notes and citations</li>
              <li>✓ Interactive progress tracking</li>
              <li>✓ Verified quizzes with explanations</li>
              <li>✓ Free access to full curriculum</li>
            </ul>
          </div>

          {/* Related Courses */}
          {course.related && course.related.length > 0 && (
            <div className="sidebar-card">
              <h3>Related Courses</h3>
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
