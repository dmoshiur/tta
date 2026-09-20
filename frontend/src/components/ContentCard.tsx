import React from 'react';
import { Link } from 'react-router-dom';
import type { ContentItem } from '../types/index.ts';
import { useI18n } from '../i18n/index.tsx';
import { IconArrowRight } from './icons.tsx';

/** Editorial content card — cover art when present, typographic when not. */
export const ContentCard: React.FC<{ item: ContentItem }> = ({ item }) => {
  const { t } = useI18n();
  return (
    <article className="tta-card content-card">
      {item.cover_url && (
        <Link to={`/read/${item.slug}`} className="card-media-wrap" tabIndex={-1} aria-hidden="true">
          <img src={item.cover_url} alt="" className="card-thumb" loading="lazy" />
        </Link>
      )}

      <div className="card-body">
        <div className="card-meta">
          <span className="card-type-tag">{item.type}</span>
          {item.stance && (
            <span className={`badge-stance stance-${item.stance.toLowerCase()}`}>{item.stance}</span>
          )}
          <span className="card-reading-time">
            {item.reading_minutes || 2} {t('card.minRead')}
          </span>
        </div>

        <h3 className="card-title">
          <Link to={`/read/${item.slug}`}>{item.title}</Link>
        </h3>

        <p className="card-excerpt">{item.excerpt}</p>

        <div className="card-footer">
          <span className="card-author">
            {t('course.by')} {item.author || t('card.editorialTeam')}
          </span>
          <Link to={`/read/${item.slug}`} className="card-link">
            {t('card.readPiece')}
            <IconArrowRight size={15} className="card-arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
};
