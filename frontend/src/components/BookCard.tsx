import React from 'react';
import { Link } from 'react-router-dom';
import type { Book } from '../types/index.ts';
import { useI18n } from '../i18n/index.tsx';
import { IconArrowRight } from './icons.tsx';

/** Library book card — cover tilt, spine shadow, editorial mock cover fallback. */
export const BookCard: React.FC<{ book: Book }> = ({ book }) => {
  const { t } = useI18n();
  return (
    <article className="tta-card book-card">
      <Link to={`/books/${book.slug}`} className="book-cover-wrap" tabIndex={-1} aria-hidden="true">
        {book.cover_url ? (
          <img src={book.cover_url} alt="" className="book-cover-img" loading="lazy" />
        ) : (
          <div className="book-cover-mock">
            <span className="mock-spine">THINKTANK</span>
            <div className="mock-details">
              <strong className="mock-title">{book.title}</strong>
              <span className="mock-author">{book.author_name}</span>
            </div>
          </div>
        )}
      </Link>

      <div className="card-body">
        <div className="card-meta">
          <span className="card-author">
            {t('course.by')} {book.author_name}
          </span>
          {book.rating > 0 && <span className="book-rating">★ {book.rating.toFixed(1)}</span>}
        </div>

        <h3 className="card-title">
          <Link to={`/books/${book.slug}`}>{book.title}</Link>
        </h3>

        <p className="card-excerpt">{book.description}</p>

        <div className="card-footer">
          <span className="book-specs">
            {book.published_year ? `${book.published_year} · ` : ''}
            {book.pages ? `${book.pages} ${t('card.pages')}` : t('card.bookSummary')}
          </span>
          <Link to={`/books/${book.slug}`} className="card-link">
            {t('card.keyLessons')}
            <IconArrowRight size={15} className="card-arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
};
