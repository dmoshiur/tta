import React from 'react';
import { Link } from 'react-router-dom';
import type { Book } from '../types/index.ts';

export const BookCard: React.FC<{ book: Book }> = ({ book }) => {
  return (
    <article className="tta-card book-card">
      <Link to={`/books/${book.slug}`} className="book-cover-wrap" tabIndex={-1}>
        {book.cover_url ? (
          <img src={book.cover_url} alt="" className="book-cover-img" loading="lazy" />
        ) : (
          <div className="book-cover-mock">
            <span className="mock-spine">IDEAS</span>
            <div className="mock-details">
              <strong className="mock-title">{book.title}</strong>
              <span className="mock-author">{book.author_name}</span>
            </div>
          </div>
        )}
      </Link>

      <div className="card-body">
        <div className="card-meta">
          <span className="card-author">By {book.author_name}</span>
          {book.rating > 0 && <span className="book-rating">★ {book.rating.toFixed(1)}</span>}
        </div>

        <h3 className="card-title">
          <Link to={`/books/${book.slug}`}>{book.title}</Link>
        </h3>

        <p className="card-excerpt">{book.description}</p>

        <div className="card-footer">
          <span className="book-specs">
            {book.published_year ? `${book.published_year} • ` : ''}
            {book.pages ? `${book.pages} pages` : 'Book Summary'}
          </span>
          <Link to={`/books/${book.slug}`} className="card-link">
            Key Lessons →
          </Link>
        </div>
      </div>
    </article>
  );
};
