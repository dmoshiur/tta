import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { contentApi } from '../api.ts';
import type { Book } from '../types/index.ts';
import { BookCard } from '../components/BookCard.tsx';
import { LoadingState, EmptyState, ErrorState } from '../components/States.tsx';

export const BooksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(qParam);

  useEffect(() => {
    setLoading(true);
    contentApi
      .getBooks({ q: qParam, limit: 20 })
      .then((res) => {
        setBooks(res.items);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load books.');
        setLoading(false);
      });
  }, [qParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) next.set('q', searchInput.trim());
    else next.delete('q');
    setSearchParams(next);
  };

  return (
    <div className="page-container books-catalog-page">
      <header className="page-header">
        <p className="page-eyebrow">BOOKS & IDEAS</p>
        <h1 className="page-title">Book Summaries & Big Ideas</h1>
        <p className="page-lead">
          Essential insights from foundational works in psychology, history, philosophy, and human thought — with context, practical applications, and critical reviews.
        </p>

        <form onSubmit={handleSearch} className="catalog-search-form">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search books by title, author, or concept…"
            aria-label="Search books"
            className="catalog-search-input"
          />
          <button type="submit" className="btn-primary search-btn">Search</button>
        </form>
      </header>

      {loading ? (
        <LoadingState message="Loading book library…" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      ) : books.length === 0 ? (
        <EmptyState
          title="No books match your search"
          message="Try searching for another title, author, or topic."
          actionText="Clear Search"
          onAction={() => { setSearchInput(''); setSearchParams(new URLSearchParams()); }}
        />
      ) : (
        <div className="cards-grid books-grid">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
};
