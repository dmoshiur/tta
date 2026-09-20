import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { all, count, insert, one, run } from '../db/index.ts';
import { badRequest, notFound } from '../lib/errors.ts';
import { like, ok, pagination, parse, route } from '../lib/http.ts';
import { fromJson, newId } from '../lib/util.ts';
import { sanitizePlainText } from '../lib/sanitize.ts';
import { authenticate, optionalAuth } from '../middleware/auth.ts';
import { config, storagePersistent } from '../config.ts';
import { SECTIONS } from '../db/taxonomy.ts';
import { notify } from '../services/notifications.ts';

export const discoveryRoutes = Router();

export const BOOKMARK_TYPES = ['COURSE', 'LESSON', 'ARTICLE', 'BOOK', 'QUIZ', 'CONTENT'] as const;

const contactLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many messages. Please try again later.' } },
});

const subscribeLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
});

// ── Global search ───────────────────────────────────────────────────────────

async function searchCourses(term: string, limit: number) {
  return all<Record<string, any>>(
    `SELECT c.id, c.title, c.slug, c.summary AS excerpt, c.section, c.difficulty, c.thumbnail_url, cat.name AS category
       FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status = 'PUBLISHED' AND (c.title ILIKE $1 OR c.summary ILIKE $1 OR c.description ILIKE $1)
      ORDER BY c.is_featured DESC, c.views DESC LIMIT $2`,
    [like(term), limit],
  );
}

async function searchLessons(term: string, limit: number) {
  return all<Record<string, any>>(
    `SELECT l.id, l.title, l.slug, l.summary AS excerpt, c.title AS course_title, c.slug AS course_slug
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       JOIN courses c ON c.id = m.course_id
      WHERE l.status = 'PUBLISHED' AND c.status = 'PUBLISHED' AND (l.title ILIKE $1 OR l.summary ILIKE $1 OR l.content ILIKE $1)
      ORDER BY l.title LIMIT $2`,
    [like(term), limit],
  );
}

async function searchContent(term: string, limit: number, type?: string) {
  return all<Record<string, any>>(
    `SELECT c.id, c.title, c.slug, c.excerpt, c.type, c.cover_url, cat.name AS category
       FROM content c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status = 'PUBLISHED'${type ? ` AND c.type = $3` : ''} AND (c.title ILIKE $1 OR c.excerpt ILIKE $1 OR c.body ILIKE $1)
      ORDER BY c.published_at DESC LIMIT $2`,
    type ? [like(term), limit, type] : [like(term), limit],
  );
}

async function searchBooks(term: string, limit: number) {
  return all<Record<string, any>>(
    `SELECT b.id, b.title, b.slug, b.description AS excerpt, b.author_name, b.cover_url
       FROM books b
      WHERE b.status = 'PUBLISHED' AND (b.title ILIKE $1 OR b.author_name ILIKE $1 OR b.description ILIKE $1 OR b.summary ILIKE $1)
      ORDER BY b.is_featured DESC, b.title LIMIT $2`,
    [like(term), limit],
  );
}

async function searchQuizzes(term: string, limit: number) {
  return all<Record<string, any>>(
    `SELECT q.id, q.title, q.slug, q.description AS excerpt, q.kind, q.duration_minutes, q.question_count
       FROM quizzes q
      WHERE q.status = 'PUBLISHED' AND (q.title ILIKE $1 OR q.description ILIKE $1)
      ORDER BY q.is_featured DESC, q.published_at DESC LIMIT $2`,
    [like(term), limit],
  );
}

async function searchCategories(term: string, limit: number) {
  return all<Record<string, any>>(
    `SELECT id, name, slug, section, description FROM categories
      WHERE is_active = TRUE AND (name ILIKE $1 OR description ILIKE $1)
      ORDER BY name LIMIT $2`,
    [like(term), limit],
  );
}

async function searchMcqs(term: string, limit: number) {
  return all<Record<string, any>>(
    `SELECT q.id, q.prompt AS title, q.difficulty, q.kind, quiz.title AS quiz_title, quiz.slug AS quiz_slug
       FROM questions q LEFT JOIN quizzes quiz ON quiz.id = q.quiz_id
      WHERE q.status = 'PUBLISHED' AND q.prompt ILIKE $1
      ORDER BY q.difficulty LIMIT $2`,
    [like(term), limit],
  );
}

discoveryRoutes.get(
  '/search',
  route(async (req, res) => {
    const term = String(req.query.q ?? '').trim().slice(0, 120);
    const type = typeof req.query.type === 'string' && req.query.type ? req.query.type.toLowerCase() : null;
    const page = pagination(req.query as Record<string, unknown>, 10, 50);

    if (term.length < 2) {
      return ok(res, { query: term, total: 0, groups: {}, results: [], page: page.page, limit: page.limit, pages: 1 });
    }

    const perGroup = Math.min(page.limit, 8);
    const [courses, lessons, content, books, quizzes, categories, mcqs] = [
      await searchCourses(term, perGroup),
      await searchLessons(term, perGroup),
      await searchContent(term, perGroup),
      await searchBooks(term, perGroup),
      await searchQuizzes(term, perGroup),
      await searchCategories(term, perGroup),
      await searchMcqs(term, perGroup),
    ];

    const groups = { courses, lessons, content, books, quizzes, categories, mcqs };
    const allResults = [
      ...courses.map((row) => ({ ...row, result_type: 'COURSE', href: `/courses/${row.slug}` })),
      ...quizzes.map((row) => ({ ...row, result_type: 'QUIZ', href: `/quizzes/${row.slug}` })),
      ...books.map((row) => ({ ...row, result_type: 'BOOK', href: `/books/${row.slug}` })),
      ...content.map((row) => ({ ...row, result_type: row.type, href: `/read/${row.slug}` })),
      ...lessons.map((row) => ({ ...row, result_type: 'LESSON', href: `/lessons/${row.id}` })),
      ...categories.map((row) => ({ ...row, result_type: 'CATEGORY', href: `/search?q=${encodeURIComponent(row.name)}` })),
      ...mcqs.map((row) => ({ ...row, result_type: 'MCQ', href: row.quiz_slug ? `/quizzes/${row.quiz_slug}` : '/quizzes' })),
    ];

    const filtered = type ? allResults.filter((row) => row.result_type.toLowerCase() === type) : allResults;
    const start = (page.page - 1) * page.limit;

    ok(res, {
      query: term,
      total: filtered.length,
      counts: {
        courses: courses.length,
        lessons: lessons.length,
        content: content.length,
        books: books.length,
        quizzes: quizzes.length,
        categories: categories.length,
        mcqs: mcqs.length,
      },
      groups: type ? {} : groups,
      results: filtered.slice(start, start + page.limit),
      page: page.page,
      limit: page.limit,
      pages: Math.max(1, Math.ceil(filtered.length / page.limit)),
    });
  }),
);

// ── Bookmarks ───────────────────────────────────────────────────────────────

async function resolveBookmarks(rows: Record<string, any>[]) {
  const byType = new Map<string, string[]>();
  for (const row of rows) {
    const list = byType.get(row.item_type) ?? [];
    list.push(row.item_id);
    byType.set(row.item_type, list);
  }

  const resolved = new Map<string, Record<string, any>>();
  for (const [type, ids] of byType) {
    if (!ids.length) continue;
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    let items: Record<string, any>[] = [];
    if (type === 'COURSE') {
      items = await all(`SELECT id, title, slug, summary AS excerpt, thumbnail_url AS image, section FROM courses WHERE id IN (${placeholders})`, ids);
    } else if (type === 'BOOK') {
      items = await all(`SELECT id, title, slug, description AS excerpt, cover_url AS image, author_name AS subtitle FROM books WHERE id IN (${placeholders})`, ids);
    } else if (type === 'QUIZ') {
      items = await all(`SELECT id, title, slug, description AS excerpt, kind AS subtitle FROM quizzes WHERE id IN (${placeholders})`, ids);
    } else if (type === 'LESSON') {
      items = await all(
        `SELECT l.id, l.title, l.slug, l.summary AS excerpt, c.slug AS course_slug, c.title AS subtitle
           FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
          WHERE l.id IN (${placeholders})`,
        ids,
      );
    } else {
      items = await all(`SELECT id, title, slug, excerpt, cover_url AS image, type AS subtitle FROM content WHERE id IN (${placeholders})`, ids);
    }
    for (const item of items) resolved.set(`${type}:${item.id}`, { ...item, item_type: type });
  }
  return resolved;
}

function bookmarkHref(type: string, item: Record<string, any>): string {
  if (type === 'COURSE') return `/courses/${item.slug}`;
  if (type === 'BOOK') return `/books/${item.slug}`;
  if (type === 'QUIZ') return `/quizzes/${item.slug}`;
  if (type === 'LESSON') return `/lessons/${item.id}`;
  return `/read/${item.slug}`;
}

discoveryRoutes.get(
  '/bookmarks',
  authenticate,
  route(async (req, res) => {
    const type = typeof req.query.type === 'string' && req.query.type ? req.query.type.toUpperCase() : null;
    const rows = await all<Record<string, any>>(
      `SELECT id, item_type, item_id, note, created_at FROM bookmarks
        WHERE user_id = $1${type ? ' AND item_type = $2' : ''}
        ORDER BY created_at DESC`,
      type ? [req.user!.id, type] : [req.user!.id],
    );
    const resolved = await resolveBookmarks(rows);
    ok(
      res,
      rows.map((row) => {
        const item = resolved.get(`${row.item_type}:${row.item_id}`);
        return {
          id: row.id,
          item_type: row.item_type,
          item_id: row.item_id,
          note: row.note,
          created_at: row.created_at,
          item: item ? { ...item, href: bookmarkHref(row.item_type, item) } : null,
        };
      }),
    );
  }),
);

discoveryRoutes.post(
  '/bookmarks',
  authenticate,
  route(async (req, res) => {
    const data = parse(
      z.object({
        item_type: z.enum(BOOKMARK_TYPES),
        item_id: z.string().min(1),
        note: z.string().trim().max(280).optional(),
      }),
      req.body,
    );

    // Verify the target exists so bookmarks never point at nothing.
    const table =
      data.item_type === 'COURSE' ? 'courses' : data.item_type === 'BOOK' ? 'books' : data.item_type === 'QUIZ' ? 'quizzes' : data.item_type === 'LESSON' ? 'lessons' : 'content';
    const target = await one<{ id: string }>(`SELECT id FROM ${table} WHERE id = $1`, [data.item_id]);
    if (!target) throw notFound('The item you tried to save no longer exists.');

    const existing = await one<{ id: string }>(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND item_type = $2 AND item_id = $3',
      [req.user!.id, data.item_type, data.item_id],
    );
    if (existing) {
      if (data.note !== undefined) await run('UPDATE bookmarks SET note = $1 WHERE id = $2', [sanitizePlainText(data.note), existing.id]);
      return ok(res, { id: existing.id, bookmarked: true, alreadySaved: true });
    }

    const id = newId();
    await insert('bookmarks', {
      id,
      user_id: req.user!.id,
      item_type: data.item_type,
      item_id: data.item_id,
      note: sanitizePlainText(data.note ?? ''),
    });
    ok(res, { id, bookmarked: true }, 201);
  }),
);

discoveryRoutes.delete(
  '/bookmarks/:type/:id',
  authenticate,
  route(async (req, res) => {
    const itemType = String(req.params.type ?? '').toUpperCase();
    const itemId = String(req.params.id ?? '');
    const removed = await run('DELETE FROM bookmarks WHERE user_id = $1 AND item_type = $2 AND item_id = $3', [
      req.user!.id,
      itemType,
      itemId,
    ]);
    if (!removed) throw notFound('Bookmark not found.');
    ok(res, { bookmarked: false });
  }),
);

// ── Notifications ───────────────────────────────────────────────────────────

discoveryRoutes.get(
  '/notifications',
  authenticate,
  route(async (req, res) => {
    const rows = await all<Record<string, any>>(
      `SELECT id, user_id, audience, title, message, type, link, read_at, created_at
         FROM notifications
        WHERE user_id = $1 OR (user_id IS NULL AND audience = 'ALL')
        ORDER BY created_at DESC LIMIT 100`,
      [req.user!.id],
    );
    const unread = rows.filter((row) => !row.read_at).length;
    ok(res, { items: rows, unread });
  }),
);

discoveryRoutes.patch(
  '/notifications/:id/read',
  authenticate,
  route(async (req, res) => {
    const notification = await one<Record<string, any>>('SELECT * FROM notifications WHERE id = $1', [req.params.id]);
    if (!notification) throw notFound('Notification not found.');
    if (notification.user_id && notification.user_id !== req.user!.id) throw badRequest('This notification belongs to another user.');
    await run('UPDATE notifications SET read_at = NOW() WHERE id = $1', [req.params.id]);
    ok(res, { read: true });
  }),
);

discoveryRoutes.post(
  '/notifications/read-all',
  authenticate,
  route(async (req, res) => {
    await run('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL', [req.user!.id]);
    ok(res, { read: true });
  }),
);

discoveryRoutes.delete(
  '/notifications/:id',
  authenticate,
  route(async (req, res) => {
    const removed = await run('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    if (!removed) throw notFound('Notification not found.');
    ok(res, { deleted: true });
  }),
);

// ── Contact, newsletter and analytics ───────────────────────────────────────

discoveryRoutes.post(
  '/contact',
  contactLimiter,
  route(async (req, res) => {
    const data = parse(
      z.object({
        name: z.string().trim().min(2).max(80),
        email: z.string().trim().toLowerCase().email(),
        subject: z.string().trim().min(3).max(140),
        message: z.string().trim().min(10).max(4000),
      }),
      req.body,
    );
    const id = newId();
    await insert('contacts', {
      id,
      name: sanitizePlainText(data.name),
      email: data.email,
      subject: sanitizePlainText(data.subject),
      message: sanitizePlainText(data.message),
    });
    await notify({
      audience: 'ADMIN',
      title: `New message: ${data.subject}`,
      message: `${data.name} <${data.email}> sent a message through the contact form.`,
      type: 'SYSTEM',
      link: '/admin/messages',
    });
    ok(res, { received: true, id }, 201);
  }),
);

discoveryRoutes.post(
  '/newsletter',
  subscribeLimiter,
  route(async (req, res) => {
    const data = parse(z.object({ email: z.string().trim().toLowerCase().email() }), req.body);
    const existing = await one<{ id: string; status: string }>('SELECT id, status FROM subscribers WHERE email = $1', [data.email]);
    if (existing) {
      if (existing.status !== 'SUBSCRIBED') await run("UPDATE subscribers SET status = 'SUBSCRIBED' WHERE id = $1", [existing.id]);
      return ok(res, { subscribed: true, alreadySubscribed: true });
    }
    await insert('subscribers', { id: newId(), email: data.email, status: 'SUBSCRIBED' });
    ok(res, { subscribed: true }, 201);
  }),
);

discoveryRoutes.post(
  '/newsletter/unsubscribe',
  subscribeLimiter,
  route(async (req, res) => {
    const data = parse(z.object({ email: z.string().trim().toLowerCase().email() }), req.body);
    await run("UPDATE subscribers SET status = 'UNSUBSCRIBED' WHERE email = $1", [data.email]);
    ok(res, { unsubscribed: true });
  }),
);

const analyticsLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });

discoveryRoutes.post(
  '/analytics',
  analyticsLimiter,
  optionalAuth,
  route(async (req, res) => {
    const data = parse(
      z.object({
        event: z.enum(['PAGE_VIEW', 'COURSE_VIEW', 'LESSON_VIEW', 'QUIZ_START', 'SEARCH', 'BOOKMARK', 'ENROLMENT', 'NEWSLETTER']),
        path: z.string().trim().max(300).default(''),
        label: z.string().trim().max(200).optional(),
      }),
      req.body,
    );
    await insert('analytics_events', {
      id: newId(),
      event: data.event,
      path: data.path,
      label: sanitizePlainText(data.label ?? ''),
      user_id: req.user?.id ?? null,
      referrer: String(req.get('referer') ?? '').slice(0, 300),
      user_agent: String(req.get('user-agent') ?? '').slice(0, 300),
    });
    ok(res, { recorded: true }, 201);
  }),
);

// ── Public settings and the homepage aggregate ──────────────────────────────

async function publicSettings() {
  const rows = await all<{ key: string; value: unknown }>('SELECT key, value FROM settings WHERE is_public = TRUE');
  return Object.fromEntries(rows.map((row) => [row.key, fromJson(row.value, {})]));
}

discoveryRoutes.get(
  '/settings/public',
  route(async (_req, res) => {
    ok(res, await publicSettings());
  }),
);

let homeCache: { at: number; payload: unknown } | null = null;
const HOME_CACHE_MS = 60_000;

async function buildHomePayload() {
  const settings = await publicSettings();
  const featuredCourses = await all<Record<string, any>>(
    `SELECT c.*, cat.name AS category FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status = 'PUBLISHED' AND c.is_featured = TRUE ORDER BY c.published_at DESC LIMIT 6`,
  );
  const latestCourses = await all<Record<string, any>>(
    `SELECT c.*, cat.name AS category FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status = 'PUBLISHED' ORDER BY c.published_at DESC LIMIT 8`,
  );
  const popularCourses = await all<Record<string, any>>(
    `SELECT c.*, cat.name AS category FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status = 'PUBLISHED' ORDER BY c.views DESC, c.published_at DESC LIMIT 4`,
  );
  const jobPrepCourses = await all<Record<string, any>>(
    `SELECT c.*, cat.name AS category FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status = 'PUBLISHED' AND c.section = 'JOB_PREP' ORDER BY c.is_featured DESC, c.published_at DESC LIMIT 3`,
  );
  const academicCourses = await all<Record<string, any>>(
    `SELECT c.*, cat.name AS category FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status = 'PUBLISHED' AND c.section = 'ACADEMIC' ORDER BY c.is_featured DESC, c.published_at DESC LIMIT 3`,
  );
  const books = await all<Record<string, any>>(
    `SELECT b.*, cat.name AS category FROM books b LEFT JOIN categories cat ON cat.id = b.category_id
      WHERE b.status = 'PUBLISHED' ORDER BY b.is_featured DESC, b.published_at DESC LIMIT 4`,
  );
  const knowledge = await all<Record<string, any>>(
    `SELECT c.*, cat.name AS category FROM content c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status = 'PUBLISHED' AND c.type = 'KNOWLEDGE' ORDER BY c.published_at DESC LIMIT 4`,
  );
  const world = await all<Record<string, any>>(
    `SELECT c.*, cat.name AS category FROM content c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status = 'PUBLISHED' AND c.type = 'WORLD' ORDER BY c.published_at DESC LIMIT 3`,
  );
  const humanity = await all<Record<string, any>>(
    `SELECT c.*, cat.name AS category FROM content c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status = 'PUBLISHED' AND c.type = 'HUMANITY' ORDER BY c.published_at DESC LIMIT 3`,
  );
  const society = await all<Record<string, any>>(
    `SELECT c.*, cat.name AS category FROM content c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status = 'PUBLISHED' AND c.type = 'SOCIETY' ORDER BY c.published_at DESC LIMIT 3`,
  );
  const articles = await all<Record<string, any>>(
    `SELECT c.*, cat.name AS category FROM content c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status = 'PUBLISHED' AND c.type = 'ARTICLE' ORDER BY c.published_at DESC LIMIT 4`,
  );
  const quizzes = await all<Record<string, any>>(
    `SELECT q.*, cat.name AS category FROM quizzes q LEFT JOIN categories cat ON cat.id = q.category_id
      WHERE q.status = 'PUBLISHED' ORDER BY q.is_featured DESC, q.published_at DESC LIMIT 4`,
  );
  const modelTests = await all<Record<string, any>>(
    `SELECT q.*, cat.name AS category FROM quizzes q LEFT JOIN categories cat ON cat.id = q.category_id
      WHERE q.status = 'PUBLISHED' AND q.kind = 'MODEL_TEST' ORDER BY q.published_at DESC LIMIT 3`,
  );

  const stats = {
    learners: await count('users', "role_id IN (SELECT id FROM roles WHERE name = 'USER')"),
    courses: await count('courses', "status = 'PUBLISHED'"),
    lessons: await count('lessons', "status = 'PUBLISHED'"),
    articles: await count('content', "status = 'PUBLISHED'"),
    books: await count('books', "status = 'PUBLISHED'"),
    quizzes: await count('quizzes', "status = 'PUBLISHED'"),
    questions: await count('questions', "status = 'PUBLISHED'"),
    categories: await count('categories', 'is_active = TRUE'),
  };

  return {
    settings,
    sections: SECTIONS.map((section) => ({ id: section.id, label: section.label, tagline: section.tagline, description: section.description, path: section.path })),
    stats,
    featured_courses: featuredCourses,
    latest_courses: latestCourses,
    popular_courses: popularCourses,
    job_prep_courses: jobPrepCourses,
    academic_courses: academicCourses,
    books,
    knowledge,
    world,
    humanity,
    society,
    articles,
    quizzes,
    model_tests: modelTests,
    generated_at: new Date().toISOString(),
  };
}

/** Single aggregated call that renders the whole homepage — one round trip on mobile networks. */
discoveryRoutes.get(
  '/home',
  route(async (req, res) => {
    if (req.query.refresh === '1') homeCache = null;
    if (!homeCache || Date.now() - homeCache.at > HOME_CACHE_MS) {
      homeCache = { at: Date.now(), payload: await buildHomePayload() };
    }
    ok(res, homeCache.payload);
  }),
);

/** Platform capabilities — lets Android/web clients feature-detect instead of hardcoding. */
discoveryRoutes.get(
  '/meta',
  route(async (_req, res) => {
    ok(res, {
      name: config.site.name,
      tagline: config.site.tagline,
      version: '2.0.0',
      api: '/api/v1',
      publicUrl: config.publicUrl || null,
      storage: { driver: config.storage.driver, persistent: storagePersistent },
      mail: { configured: Boolean(config.smtp.host) },
      push: { configured: false },
      sections: SECTIONS.map((section) => ({ id: section.id, label: section.label, path: section.path })),
      contentTypes: ['ARTICLE', 'KNOWLEDGE', 'WORLD', 'HUMANITY', 'SOCIETY'],
      quizKinds: ['QUIZ', 'MCQ', 'MODEL_TEST'],
      bookmarkTypes: [...BOOKMARK_TYPES],
    });
  }),
);
