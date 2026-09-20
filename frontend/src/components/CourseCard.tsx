import React from 'react';
import { Link } from 'react-router-dom';
import type { Course } from '../types/index.ts';
import { useI18n } from '../i18n/index.tsx';
import { IconArrowRight } from './icons.tsx';

/** Premium editorial course card — media zoom, hairline borders, moving arrow. */
export const CourseCard: React.FC<{ course: Course }> = ({ course }) => {
  const { t } = useI18n();
  return (
    <article className="tta-card course-card">
      <Link to={`/courses/${course.slug}`} className="card-media-wrap" tabIndex={-1} aria-hidden="true">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt="" className="card-thumb" loading="lazy" />
        ) : (
          <div className="card-fallback-thumb">
            <span className="fallback-tagline">{t('brand.tagline').toUpperCase()}</span>
            <span className="fallback-section">{course.category || course.section?.replaceAll('_', ' ') || 'ACADEMIA'}</span>
          </div>
        )}
        <span className={`badge-difficulty ${course.difficulty?.toLowerCase()}`}>{course.difficulty}</span>
      </Link>

      <div className="card-body">
        <div className="card-meta">
          <span className="card-category">{course.category || course.section_label || course.section}</span>
          {course.lesson_count ? <span>{course.lesson_count} {t('course.lessons')}</span> : null}
          {course.duration_minutes > 0 && <span className="card-duration">{course.duration_minutes}m</span>}
        </div>

        <h3 className="card-title">
          <Link to={`/courses/${course.slug}`}>{course.title}</Link>
        </h3>

        <p className="card-excerpt">{course.summary || course.description}</p>

        <div className="card-footer">
          <span className="card-instructor">
            {course.instructor ? `${t('course.by')} ${course.instructor}` : t('course.faculty')}
          </span>
          <Link to={`/courses/${course.slug}`} className="card-link">
            {t('course.startCourse')}
            <IconArrowRight size={15} className="card-arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
};
