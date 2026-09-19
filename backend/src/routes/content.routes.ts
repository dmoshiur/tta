import { Router } from 'express';
import { all, one, run } from '../db/index.ts';
import { notFound } from '../lib/errors.ts';
import { like, ok, pagination, paged, route } from '../lib/http.ts';
import { fromJson } from '../lib/util.ts';
import { optionalAuth } from '../middleware/auth.ts';
import type { SessionUser } from '../security/session.ts';

export const contentRoutes = Router();

export const CONTENT_TYPES = ['ARTICLE', 'KNOWLEDGE', 'WORLD', 'HUMANITY', 'SOCIETY'] as const;

const CONTENT_SORTS: Record<string, string> = {
  newest: 'published_at DESC',
  oldest: 'published_at ASC',
  title: 'title ASC',
  popular: 'views DESC',
};

function publicContent(row: Record<string, any>) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    cover_url: row.cover_url ?? null,
    category: row.category ?? null,
    category_slug: row.category_slug ?? null,
    author: (row.author_name || row.author) ?? 'ThinkTank Editorial',
    stance: row.stance ?? 'ANALYSIS',
    tags: row.tags ?? [],
    reading_minutes: Number(row.reading_minutes ?? 1),
    is_featured: Boolean(row.is_featured),
    views: Number(row.views ?? 0),
    status: row.status,
    published_at: row.published_at,
    updated_at: row.updated_at,
  };
}

function publicBook(row: Record<string, any>) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    author_name: row.author_name,
    published_year: row.published_year ? Number(row.published_year) : null,
    pages: row.pages ? Number(row.pages) : null,
    rating: Number(row.rating ?? 0),
    cover_url: row.cover_url ?? null,
    description: row.description,
    category: row.category ?? null,
    category_slug: row.category_slug ?? null,
    tags: row.tags ?? [],
    is_featured: Boolean(row.is_featured),
    views: Number(row.views ?? 0),
    status: row.status,
    published_at: row.published_at,
  };
}

async function trackView(user: SessionUser | undefined, type: string, id: string, title: string, slug: string): Promise<void> {
  if (user) {
    await run(
      `INSERT INTO recently_viewed(user_id, item_type, item_id, item_title, item_slug, viewed_at)
       VALUES($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET viewed_at = NOW(), item_title = $4`,
      [user.id, type, id, title, slug],
    );
  }
}

// ── Articles, knowledge, world, humanity, society ───────────────────────────

contentRoutes.get(
  '/content',
  route(async (req, res) => {
    const page = pagination(req.query as Record<string, unknown>);
    const rawType = String(req.query.type ?? 'ALL').toUpperCase();
    const types = rawType === 'ALL' ? [...CONTENT_TYPES] : rawType.split(',').map((type) => type.trim().toUpperCase());
    const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category = typeof req.query.category === 'string' && req.query.category ? req.query.category : null;
    const tag = typeof req.query.tag === 'string' && req.query.tag ? req.query.tag.toLowerCase() : null;
    const stance = typeof req.query.stance === 'string' && req.query.stance ? req.query.stance.toUpperCase() : null;
    const sort = CONTENT_SORTS[String(req.query.sort ?? 'newest')] ?? CONTENT_SORTS.newest;
    const featured = req.query.featured === 'true' || req.query.featured === '1';

    const where: string[] = [`c.status = 'PUBLISHED'`, `c.type IN (${types.map((_, index) => `$${index + 1}`).join(', ')})`];
    const params: unknown[] = [...types];
    if (term) {
      params.push(like(term));
      where.push(`(c.title ILIKE $${params.length} OR c.excerpt ILIKE $${params.length} OR c.body ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      where.push(`(cat.slug = $${params.length} OR cat.name ILIKE $${params.length})`);
    }
    if (stance) {
      params.push(stance);
      where.push(`c.stance = $${params.length}`);
    }
    if (featured) where.push('c.is_featured = TRUE');
    const whereSql = where.join(' AND ');

    const total = await one<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM content c LEFT JOIN categories cat ON cat.id = c.category_id WHERE ${whereSql}`,
      params,
    );
    const rows = await all<Record<string, any>>(
      `SELECT c.*, cat.name AS category, cat.slug AS category_slug
         FROM content c LEFT JOIN categories cat ON cat.id = c.category_id
        WHERE ${whereSql}
        ORDER BY c.is_featured DESC, ${sort}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, page.limit, page.offset],
    );

    let items = rows.map(publicContent);
    if (tag) items = items.filter((item) => (item.tags ?? []).some((value: string) => value.toLowerCase() === tag));

    ok(res, paged(items, page, Number(total?.total ?? 0)));
  }),
);

contentRoutes.get(
  '/content/:slug',
  optionalAuth,
  route(async (req, res) => {
    const row = await one<Record<string, any>>(
      `SELECT c.*, cat.name AS category, cat.slug AS category_slug, u.name AS author
         FROM content c
         LEFT JOIN categories cat ON cat.id = c.category_id
         LEFT JOIN users u ON u.id = c.author_id
        WHERE (c.slug = $1 OR c.id = $1)`,
      [req.params.slug],
    );
    if (!row || (row.status !== 'PUBLISHED' && req.user?.roleName === 'USER')) throw notFound('Article not found.');

    await trackView(req.user, row.type, row.id, row.title, row.slug);
    run('UPDATE content SET views = views + 1 WHERE id = $1', [row.id]).catch(() => undefined);

    const related = await all<Record<string, any>>(
      `SELECT c.*, cat.name AS category, cat.slug AS category_slug
         FROM content c LEFT JOIN categories cat ON cat.id = c.category_id
        WHERE c.status = 'PUBLISHED' AND c.id <> $1 AND (c.type = $2 OR c.category_id = $3)
        ORDER BY c.published_at DESC LIMIT 4`,
      [row.id, row.type, row.category_id],
    );

    const bookmarked = req.user
      ? await one<{ id: string }>('SELECT id FROM bookmarks WHERE user_id = $1 AND item_type = $2 AND item_id = $3', [
          req.user.id,
          row.type === 'ARTICLE' ? 'ARTICLE' : 'CONTENT',
          row.id,
        ])
      : undefined;

    ok(res, {
      ...publicContent(row),
      body: row.body,
      meta: fromJson(row.meta, {}),
      sources: fromJson(row.sources, []),
      seo: fromJson(row.seo, {}),
      bookmarked: Boolean(bookmarked),
      related: related.map(publicContent),
    });
  }),
);

// ── Books ───────────────────────────────────────────────────────────────────

contentRoutes.get(
  '/books',
  route(async (req, res) => {
    const page = pagination(req.query as Record<string, unknown>);
    const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category = typeof req.query.category === 'string' && req.query.category ? req.query.category : null;
    const featured = req.query.featured === 'true' || req.query.featured === '1';
    const sort = String(req.query.sort ?? 'newest');
    const order =
      sort === 'title' ? 'title ASC' : sort === 'rating' ? 'rating DESC' : sort === 'author' ? 'author_name ASC' : 'published_at DESC';

    const where = ["b.status = 'PUBLISHED'"];
    const params: unknown[] = [];
    if (term) {
      params.push(like(term));
      where.push(`(b.title ILIKE $${params.length} OR b.author_name ILIKE $${params.length} OR b.description ILIKE $${params.length} OR b.summary ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      where.push(`(cat.slug = $${params.length} OR cat.name ILIKE $${params.length})`);
    }
    if (featured) where.push('b.is_featured = TRUE');
    const whereSql = where.join(' AND ');

    const total = await one<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM books b LEFT JOIN categories cat ON cat.id = b.category_id WHERE ${whereSql}`,
      params,
    );
    const rows = await all<Record<string, any>>(
      `SELECT b.*, cat.name AS category, cat.slug AS category_slug
         FROM books b LEFT JOIN categories cat ON cat.id = b.category_id
        WHERE ${whereSql}
        ORDER BY b.is_featured DESC, ${order}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, page.limit, page.offset],
    );

    ok(res, paged(rows.map(publicBook), page, Number(total?.total ?? 0)));
  }),
);

contentRoutes.get(
  '/books/:slug',
  optionalAuth,
  route(async (req, res) => {
    const row = await one<Record<string, any>>(
      `SELECT b.*, cat.name AS category, cat.slug AS category_slug, u.name AS author
         FROM books b
         LEFT JOIN categories cat ON cat.id = b.category_id
         LEFT JOIN users u ON u.id = b.author_id
        WHERE b.slug = $1 OR b.id = $1`,
      [req.params.slug],
    );
    if (!row || (row.status !== 'PUBLISHED' && req.user?.roleName === 'USER')) throw notFound('Book not found.');

    await trackView(req.user, 'BOOK', row.id, row.title, row.slug);
    run('UPDATE books SET views = views + 1 WHERE id = $1', [row.id]).catch(() => undefined);

    const relatedSlugs = fromJson<{ slug: string; title: string }[]>(row.related, []);
    const related = await all<Record<string, any>>(
      `SELECT b.*, cat.name AS category, cat.slug AS category_slug
         FROM books b LEFT JOIN categories cat ON cat.id = b.category_id
        WHERE b.status = 'PUBLISHED' AND b.id <> $1 AND (b.category_id = $2 OR b.is_featured = TRUE)
        ORDER BY b.is_featured DESC, b.published_at DESC LIMIT 4`,
      [row.id, row.category_id],
    );

    const bookmarked = req.user
      ? await one<{ id: string }>('SELECT id FROM bookmarks WHERE user_id = $1 AND item_type = $2 AND item_id = $3', [req.user.id, 'BOOK', row.id])
      : undefined;

    ok(res, {
      ...publicBook(row),
      summary: row.summary,
      key_ideas: fromJson(row.key_ideas, []),
      lessons: fromJson(row.lessons, []),
      context: row.context,
      applications: row.applications,
      review: row.review,
      recommendation: row.recommendation,
      sources: fromJson(row.sources, []),
      seo: fromJson(row.seo, {}),
      related_slugs: relatedSlugs,
      bookmarked: Boolean(bookmarked),
      related: related.map(publicBook),
    });
  }),
);

/** Distinct tags across published editorial content — powers the tag filters. */
contentRoutes.get(
  '/tags',
  route(async (req, res) => {
    const type = typeof req.query.type === 'string' && req.query.type ? req.query.type.toUpperCase() : null;
    const rows = await all<{ tags: unknown }>(
      `SELECT tags FROM content WHERE status = 'PUBLISHED'${type ? ' AND type = $1' : ''}`,
      type ? [type] : [],
    );
    const counts = new Map<string, number>();
    for (const row of rows) {
      for (const tag of fromJson<string[]>(row.tags, [])) {
        const key = String(tag).toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    ok(
      res,
      [...counts.entries()]
        .map(([tag, total]) => ({ tag, total }))
        .sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag)),
    );
  }),
);
