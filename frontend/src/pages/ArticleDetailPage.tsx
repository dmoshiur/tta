import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { contentApi, discoveryApi } from '../api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { ContentItem } from '../types/index.ts';
import { LoadingState, ErrorState } from '../components/States.tsx';
import { useI18n } from '../i18n/index.tsx';

export const ArticleDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
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
        setError(err.message || t('articleDetail.notFound'));
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
        toast.info(t('courseDetail.unbookmarkedToast'));
      } else {
        await discoveryApi.addBookmark('ARTICLE', item.id);
        setBookmarked(true);
        toast.success(t('articleDetail.bookmarkedToast'));
      }
    } catch (err: any) {
      toast.error(err.message || t('courseDetail.bookmarkFail'));
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: item?.title, text: item?.excerpt, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(t('articleDetail.copied'));
    }
  };

  if (loading) return <LoadingState message={t('articleDetail.loading')} />;
  if (error || !item) return <ErrorState error={error || t('articleDetail.notFound')} onRetry={() => window.location.reload()} />;

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
              <strong>{t('articleDetail.byLine', { author: item.author || t('articleDetail.editorial') })}</strong>
              <span>
                {item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                {' • '}{t('articleDetail.minRead', { n: item.reading_minutes || 3 })}
              </span>
            </div>

            <div className="byline-actions">
              <button
                onClick={handleBookmark}
                className={`btn-secondary-sm ${bookmarked ? 'bookmarked-active' : ''}`}
                title={t('articleDetail.saveTitle')}
              >
                {bookmarked ? `★ ${t('articleDetail.saved')}` : `☆ ${t('articleDetail.save')}`}
              </button>
              <button onClick={handleShare} className="btn-secondary-sm" title={t('articleDetail.shareTitle')}>
                {t('articleDetail.share')} ↗
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
            <h2 className="dossier-heading">{t('articleDetail.dossier')}</h2>
            {meta.event && (
              <div className="dossier-row">
                <strong>{t('articleDetail.event')}</strong>
                <p>{meta.event}</p>
              </div>
            )}
            {meta.background && (
              <div className="dossier-row">
                <strong>{t('articleDetail.background')}</strong>
                <p>{meta.background}</p>
              </div>
            )}
            {meta.causes && Array.isArray(meta.causes) && meta.causes.length > 0 && (
              <div className="dossier-row">
                <strong>{t('articleDetail.drivers')}</strong>
                <ul>{meta.causes.map((c: string, idx: number) => <li key={idx}>{c}</li>)}</ul>
              </div>
            )}
            {meta.actors && Array.isArray(meta.actors) && meta.actors.length > 0 && (
              <div className="dossier-row">
                <strong>{t('articleDetail.actors')}</strong>
                <ul>{meta.actors.map((a: string, idx: number) => <li key={idx}>{a}</li>)}</ul>
              </div>
            )}
            {meta.perspectives && Array.isArray(meta.perspectives) && meta.perspectives.length > 0 && (
              <div className="dossier-row">
                <strong>{t('articleDetail.perspectives')}</strong>
                <ul>{meta.perspectives.map((p: string, idx: number) => <li key={idx}>{p}</li>)}</ul>
              </div>
            )}
            {meta.implications && Array.isArray(meta.implications) && meta.implications.length > 0 && (
              <div className="dossier-row">
                <strong>{t('articleDetail.implications')}</strong>
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
            <h3>{t('articleDetail.sources')}</h3>
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
            <span>{t('articleDetail.tags')}</span>
            {item.tags.map((tag, idx) => (
              <span key={idx} className="tag-pill">#{tag}</span>
            ))}
          </div>
        )}

        {/* Related Articles */}
        {item.related && item.related.length > 0 && (
          <section className="article-related-section">
            <h2>{t('articleDetail.related')}</h2>
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
