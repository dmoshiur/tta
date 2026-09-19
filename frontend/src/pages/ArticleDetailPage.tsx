import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { contentApi, discoveryApi } from '../api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { ContentItem } from '../types/index.ts';
import { LoadingState, ErrorState } from '../components/States.tsx';

export const ArticleDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    contentApi
      .getContentItem(slug)
      .then((res) => {
        setItem(res);
        setBookmarked(Boolean(res.bookmarked));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Article not found.');
        setLoading(false);
      });
  }, [slug]);

  const handleBookmark = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!item) return;
    try {
      if (bookmarked) {
        await discoveryApi.removeBookmark('ARTICLE', item.id);
        setBookmarked(false);
        toast.info('Removed from bookmarks');
      } else {
        await discoveryApi.addBookmark('ARTICLE', item.id);
        setBookmarked(true);
        toast.success('Article bookmarked');
      }
    } catch (err: any) {
      toast.error(err.message || 'Bookmark action failed.');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: item?.title, text: item?.excerpt, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Article link copied to clipboard!');
    }
  };

  if (loading) return <LoadingState message="Loading article…" />;
  if (error || !item) return <ErrorState error={error || 'Article not found.'} onRetry={() => window.location.reload()} />;

  const meta = item.meta || {};

  return (
    <div className="article-read-page">
      <article className="article-wrapper">
        {/* Header Byline */}
        <header className="article-header">
          <div className="article-meta-tags">
            <span className="article-type-pill">{item.type}</span>
            {item.stance && (
              <span className={`badge-stance stance-${item.stance.toLowerCase()}`}>
                {item.stance}
              </span>
            )}
            {item.category && <span className="article-cat-pill">{item.category}</span>}
          </div>

          <h1 className="article-headline">{item.title}</h1>
          <p className="article-lead-paragraph">{item.excerpt}</p>

          <div className="article-byline-bar">
            <div className="byline-left">
              <strong>By {item.author || 'ThinkTank Editorial'}</strong>
              <span>
                {item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                {' • '}{item.reading_minutes || 3} min read
              </span>
            </div>

            <div className="byline-actions">
              <button
                onClick={handleBookmark}
                className={`btn-secondary-sm ${bookmarked ? 'bookmarked-active' : ''}`}
                title="Bookmark article"
              >
                {bookmarked ? '★ Saved' : '☆ Save'}
              </button>
              <button onClick={handleShare} className="btn-secondary-sm" title="Share article">
                Share ↗
              </button>
            </div>
          </div>
        </header>

        {/* Cover image */}
        {item.cover_url && (
          <div className="article-hero-cover">
            <img src={item.cover_url} alt="" loading="lazy" />
          </div>
        )}

        {/* Structured World Affairs box if present */}
        {(meta.event || meta.background || meta.causes || meta.actors || meta.perspectives || meta.implications) && (
          <div className="world-structured-dossier">
            <h2 className="dossier-heading">Strategic Dossier</h2>
            {meta.event && (
              <div className="dossier-row">
                <strong>Core Event / Subject:</strong>
                <p>{meta.event}</p>
              </div>
            )}
            {meta.background && (
              <div className="dossier-row">
                <strong>Background & Context:</strong>
                <p>{meta.background}</p>
              </div>
            )}
            {meta.causes && Array.isArray(meta.causes) && meta.causes.length > 0 && (
              <div className="dossier-row">
                <strong>Primary Drivers:</strong>
                <ul>{meta.causes.map((c: string, idx: number) => <li key={idx}>{c}</li>)}</ul>
              </div>
            )}
            {meta.actors && Array.isArray(meta.actors) && meta.actors.length > 0 && (
              <div className="dossier-row">
                <strong>Key Actors & Interests:</strong>
                <ul>{meta.actors.map((a: string, idx: number) => <li key={idx}>{a}</li>)}</ul>
              </div>
            )}
            {meta.perspectives && Array.isArray(meta.perspectives) && meta.perspectives.length > 0 && (
              <div className="dossier-row">
                <strong>Differing Perspectives:</strong>
                <ul>{meta.perspectives.map((p: string, idx: number) => <li key={idx}>{p}</li>)}</ul>
              </div>
            )}
            {meta.implications && Array.isArray(meta.implications) && meta.implications.length > 0 && (
              <div className="dossier-row">
                <strong>Strategic Implications:</strong>
                <ul>{meta.implications.map((imp: string, idx: number) => <li key={idx}>{imp}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        {/* Main Article Body */}
        <div
          className="article-rich-body"
          dangerouslySetInnerHTML={{ __html: item.body || `<p>${item.excerpt}</p>` }}
        />

        {/* Citations & Sources Box */}
        {item.sources && item.sources.length > 0 && (
          <aside className="article-sources-box">
            <h3>Verified Sources & References</h3>
            <ol className="sources-list">
              {item.sources.map((src, idx) => (
                <li key={idx}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer nofollow">
                    {src.title} ↗
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        )}

        {/* Tags footer */}
        {item.tags && item.tags.length > 0 && (
          <div className="article-tags-row">
            <span>Tags:</span>
            {item.tags.map((tag, idx) => (
              <span key={idx} className="tag-pill">#{tag}</span>
            ))}
          </div>
        )}

        {/* Related Articles */}
        {item.related && item.related.length > 0 && (
          <section className="article-related-section">
            <h2>Related Analyses</h2>
            <div className="related-cards-grid">
              {item.related.map((rel) => (
                <Link to={`/read/${rel.slug}`} key={rel.id} className="related-card-item">
                  <span className="rel-type">{rel.type}</span>
                  <h4>{rel.title}</h4>
                  <p>{rel.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
};
