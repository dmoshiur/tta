import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { contentApi, discoveryApi } from '../api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { Book } from '../types/index.ts';
import { LoadingState, ErrorState } from '../components/States.tsx';

export const BookDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    contentApi
      .getBook(slug)
      .then((res) => {
        setBook(res);
        setBookmarked(Boolean(res.bookmarked));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Book not found.');
        setLoading(false);
      });
  }, [slug]);

  const handleBookmark = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!book) return;
    try {
      if (bookmarked) {
        await discoveryApi.removeBookmark('BOOK', book.id);
        setBookmarked(false);
        toast.info('Removed from bookmarks');
      } else {
        await discoveryApi.addBookmark('BOOK', book.id);
        setBookmarked(true);
        toast.success('Book summary bookmarked');
      }
    } catch (err: any) {
      toast.error(err.message || 'Bookmark action failed.');
    }
  };

  if (loading) return <LoadingState message="Loading book summary…" />;
  if (error || !book) return <ErrorState error={error || 'Book not found.'} onRetry={() => window.location.reload()} />;

  return (
    <div className="book-detail-page">
      {/* Book Banner */}
      <div className="book-banner">
        <div className="book-banner-inner">
          <div className="book-banner-cover">
            {book.cover_url ? (
              <img src={book.cover_url} alt="" className="book-banner-img" />
            ) : (
              <div className="book-banner-mock">
                <span>IDEAS</span>
                <strong>{book.title}</strong>
                <small>{book.author_name}</small>
              </div>
            )}
          </div>

          <div className="book-banner-info">
            <p className="book-eyebrow">BOOK SUMMARY & ANALYSIS</p>
            <h1 className="book-title">{book.title}</h1>
            <p className="book-byline">By <strong>{book.author_name}</strong></p>

            <div className="book-specs-chips">
              {book.published_year && <span className="spec-chip">Published {book.published_year}</span>}
              {book.pages && <span className="spec-chip">{book.pages} pages</span>}
              {book.rating > 0 && <span className="spec-chip gold-chip">★ {book.rating.toFixed(1)} / 5</span>}
            </div>

            <p className="book-short-desc">{book.description}</p>

            <div className="book-actions-row">
              <button
                onClick={handleBookmark}
                className={`btn-secondary ${bookmarked ? 'bookmarked-active' : ''}`}
              >
                {bookmarked ? '★ Bookmarked' : '☆ Save to Bookmarks'}
              </button>
              <Link to="/books" className="btn-secondary">
                ← Back to Books
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Book Deep Dive Content */}
      <div className="book-content-container">
        {/* Core Summary */}
        <section className="book-content-section">
          <h2>Executive Summary</h2>
          <div
            className="book-rich-text"
            dangerouslySetInnerHTML={{ __html: book.summary || `<p>${book.description}</p>` }}
          />
        </section>

        {/* Key Ideas */}
        {book.key_ideas && book.key_ideas.length > 0 && (
          <section className="book-content-section">
            <h2>Key Ideas & Central Arguments</h2>
            <div className="key-ideas-grid">
              {book.key_ideas.map((idea, idx) => (
                <div key={idx} className="key-idea-card">
                  <span className="idea-num">0{idx + 1}</span>
                  <h3>{idea.title}</h3>
                  <p>{idea.detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Important Lessons */}
        {book.lessons && book.lessons.length > 0 && (
          <section className="book-content-section">
            <h2>Actionable Lessons</h2>
            <ul className="lessons-checklist">
              {book.lessons.map((lesson, idx) => (
                <li key={idx} className="lesson-check-item">
                  <span className="lesson-bullet">✓</span>
                  <span>{lesson}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Author & Historical Context */}
        {book.context && (
          <section className="book-content-section">
            <h2>Author & Intellectual Context</h2>
            <div
              className="book-rich-text"
              dangerouslySetInnerHTML={{ __html: book.context }}
            />
          </section>
        )}

        {/* Practical Applications */}
        {book.applications && (
          <section className="book-content-section">
            <h2>Practical Applications</h2>
            <div
              className="book-rich-text"
              dangerouslySetInnerHTML={{ __html: book.applications }}
            />
          </section>
        )}

        {/* Critical Review */}
        {book.review && (
          <section className="book-content-section">
            <h2>Critical Assessment & Limitations</h2>
            <div
              className="book-rich-text"
              dangerouslySetInnerHTML={{ __html: book.review }}
            />
          </section>
        )}

        {/* Reading Recommendation */}
        {book.recommendation && (
          <section className="book-content-section">
            <h2>What to Read Next</h2>
            <div
              className="book-rich-text"
              dangerouslySetInnerHTML={{ __html: book.recommendation }}
            />
          </section>
        )}

        {/* Related Books */}
        {book.related && book.related.length > 0 && (
          <section className="book-content-section">
            <h2>Related Books</h2>
            <div className="related-books-grid">
              {book.related.map((rel) => (
                <Link to={`/books/${rel.slug}`} key={rel.id} className="related-book-card">
                  <strong>{rel.title}</strong>
                  <span>{rel.author_name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
