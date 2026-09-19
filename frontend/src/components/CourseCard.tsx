import React from 'react';
import { Link } from 'react-router-dom';
import type { Course } from '../types/index.ts';

export const CourseCard: React.FC<{ course: Course }> = ({ course }) => {
  return (
    <article className="tta-card course-card">
      <Link to={`/courses/${course.slug}`} className="card-media-wrap" tabIndex={-1}>
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt="" className="card-thumb" loading="lazy" />
        ) : (
          <div className="card-fallback-thumb">
            <span className="fallback-tagline">THINK • LEARN</span>
            <span className="fallback-section">{course.section?.replace('_', ' ') || 'ACADEMIA'}</span>
          </div>
        )}
        <span className={`badge-difficulty ${course.difficulty?.toLowerCase()}`}>
          {course.difficulty}
        </span>
      </Link>

      <div className="card-body">
        <div className="card-meta">
          <span className="card-category">{course.category || course.section}</span>
          {course.duration_minutes > 0 && (
            <span className="card-duration">⏱ {course.duration_minutes}m</span>
          )}
        </div>

        <h3 className="card-title">
          <Link to={`/courses/${course.slug}`}>{course.title}</Link>
        </h3>

        <p className="card-excerpt">{course.summary || course.description}</p>

        <div className="card-footer">
          <span className="card-instructor">
            {course.instructor ? `By ${course.instructor}` : 'ThinkTank Faculty'}
          </span>
          <Link to={`/courses/${course.slug}`} className="card-link">
            Start Course →
          </Link>
        </div>
      </div>
    </article>
  );
};
