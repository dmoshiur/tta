import React from 'react';
import { Link } from 'react-router-dom';
import type { ContentItem } from '../types/index.ts';

export const ContentCard: React.FC<{ item: ContentItem }> = ({ item }) => {
  return (
    <article className="tta-card content-card">
      <div className="card-body">
        <div className="card-meta">
          <span className="card-type-tag">{item.type}</span>
          {item.stance && (
            <span className={`badge-stance stance-${item.stance.toLowerCase()}`}>
              {item.stance}
            </span>
          )}
          <span className="card-reading-time">{item.reading_minutes || 2} min read</span>
        </div>

        <h3 className="card-title">
          <Link to={`/read/${item.slug}`}>{item.title}</Link>
        </h3>

        <p className="card-excerpt">{item.excerpt}</p>

        <div className="card-footer">
          <span className="card-author">By {item.author || 'Editorial Team'}</span>
          <Link to={`/read/${item.slug}`} className="card-link">
            Read Piece →
          </Link>
        </div>
      </div>
    </article>
  );
};
