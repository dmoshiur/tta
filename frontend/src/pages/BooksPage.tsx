import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { contentApi } from '../api.ts';
import type { Book } from '../types/index.ts';
import { BookCard } from '../components/BookCard.tsx';
import { LoadingState, EmptyState, ErrorState } from '../components/States.tsx';
import { RevealGroup } from '../components/Reveal.tsx';
import { useI18n } from '../i18n/index.tsx';

export const BooksPage: React.FC = () => {
  const { t } = useI18n();
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
        <p className="page-eyebrow">{t('booksPage.eyebrow')}</p>
        <h1 className="page-title">{t('booksPage.title')}</h1>
        <p className="page-lead">{t('booksPage.lead')}</p>

        <form onSubmit={handleSearch} className="catalog-search-form">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('booksPage.searchPlaceholder')}
            aria-label={t('booksPage.searchPlaceholder')}
            className="catalog-search-input"
          />
          <button type="submit" className="btn-primary search-btn">{t('articlesPage.searchBtn')}</button>
        </form>
      </header>

      {loading ? (
        <LoadingState message={t('booksPage.loading')} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      ) : books.length === 0 ? (
        <EmptyState
          title={t('booksPage.emptyTitle')}
          message={t('booksPage.emptyBody')}
          actionText={t('booksPage.clearSearch')}
          onAction={() => { setSearchInput(''); setSearchParams(new URLSearchParams()); }}
        />
      ) : (
        <div className="cards-grid books-grid">
          <RevealGroup direction="up" stagger={90}>
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </RevealGroup>
        </div>
      )}
    </div>
  );
};
