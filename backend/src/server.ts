import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config, isProduction, isTest } from './config.ts';
import { logger } from './lib/logger.ts';
import { initPool, closePool, all } from './db/index.ts';
import { seedDatabase } from './db/seed.ts';
import { apiNotFound, errorHandler } from './middleware/error.ts';
import { publishScheduled } from './admin/registry.ts';
import { requestLogger, pruneRequestLog } from './lib/request-logger.ts';
import { siteGuard } from './lib/site-status.ts';
import { ensurePasscode } from './services/hackeradmin.ts';
import { HACKERADMIN_HTML } from './pages/hackeradmin.ts';

// Feature routers
import { authRoutes } from './routes/auth.routes.ts';
import { userRoutes } from './routes/user.routes.ts';
import { learningRoutes } from './routes/learning.routes.ts';
import { quizRoutes } from './routes/quiz.routes.ts';
import { contentRoutes } from './routes/content.routes.ts';
import { discoveryRoutes } from './routes/discovery.routes.ts';
import { adminRoutes } from './routes/admin.routes.ts';
import { hackerAdminRoutes } from './routes/hackeradmin.routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

export const app = express();

// Behind Render / cloud load-balancers, trust proxy headers for accurate IPs
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite React inline scripts & styles
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(compression());

// CORS configuration — supports configured production origins or open dev access
const allowedOrigins = config.frontendOrigins;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Dev-friendly fallback; production sets FRONTEND_URL
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Traffic monitoring — feeds the /hackeradmin console (fire-and-forget inserts)
app.use(requestLogger);

// Global API rate limiter
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/health'),
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } },
});
app.use('/api', globalLimiter);

// Local uploads directory (served in development or when STORAGE_DRIVER=local)
app.use('/uploads', express.static(config.storage.localDir, { maxAge: '7d' }));

// ── Health Checks ───────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'thinktank-academia', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'thinktank-academia', version: 'v1', env: config.env });
});

// ── SEO: Dynamic Sitemap & Robots.txt ───────────────────────────────────────

app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const base = config.publicUrl || `${req.protocol}://${req.get('host')}`;
    const [courses, content, books, quizzes] = await Promise.all([
      all<{ slug: string; updated_at: string }>("SELECT slug, updated_at FROM courses WHERE status = 'PUBLISHED'"),
      all<{ slug: string; updated_at: string }>("SELECT slug, updated_at FROM content WHERE status = 'PUBLISHED'"),
      all<{ slug: string; updated_at: string }>("SELECT slug, updated_at FROM books WHERE status = 'PUBLISHED'"),
      all<{ slug: string; updated_at: string }>("SELECT slug, updated_at FROM quizzes WHERE status = 'PUBLISHED'"),
    ]);

    const staticUrls = [
      '',
      'courses',
      'job-prep',
      'academic',
      'books',
      'knowledge',
      'world',
      'humanity',
      'society',
      'quizzes',
      'articles',
      'search',
      'about',
      'contact',
      'privacy',
      'terms',
    ];

    const xmlUrls = [
      ...staticUrls.map((path) => `  <url>\n    <loc>${base}/${path}</loc>\n    <changefreq>daily</changefreq>\n  </url>`),
      ...courses.map((c) => `  <url>\n    <loc>${base}/courses/${c.slug}</loc>\n    <lastmod>${new Date(c.updated_at).toISOString().slice(0, 10)}</lastmod>\n  </url>`),
      ...content.map((c) => `  <url>\n    <loc>${base}/read/${c.slug}</loc>\n    <lastmod>${new Date(c.updated_at).toISOString().slice(0, 10)}</lastmod>\n  </url>`),
      ...books.map((b) => `  <url>\n    <loc>${base}/books/${b.slug}</loc>\n    <lastmod>${new Date(b.updated_at).toISOString().slice(0, 10)}</lastmod>\n  </url>`),
      ...quizzes.map((q) => `  <url>\n    <loc>${base}/quizzes/${q.slug}</loc>\n    <lastmod>${new Date(q.updated_at).toISOString().slice(0, 10)}</lastmod>\n  </url>`),
    ];

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlUrls.join('\n')}\n</urlset>`,
    );
  } catch (error) {
    next(error);
  }
});

app.get('/robots.txt', (req, res) => {
  const base = config.publicUrl || `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /hackeradmin\nDisallow: /dashboard\nDisallow: /my-learning\nDisallow: /bookmarks\nDisallow: /profile\nDisallow: /settings\nSitemap: ${base}/sitemap.xml\n`,
  );
});

// ── Hacker Admin (emergency operations console) ────────────────────────────
// Registered before the site guard so the console stays reachable even while
// the site is switched off — it is the only way back online.

app.use('/api/v1/hackeradmin', hackerAdminRoutes);

// Standalone operations page (no React build required)
app.get('/hackeradmin', (_req, res) => {
  res.type('html').send(HACKERADMIN_HTML);
});

// ── Site on/off kill switch (toggled from /hackeradmin) ────────────────────
app.use(siteGuard);

// ── API Routes (v1) ─────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', learningRoutes);
app.use('/api/v1', quizRoutes);
app.use('/api/v1', contentRoutes);
app.use('/api/v1', discoveryRoutes);

// 404 for unknown API calls
app.use('/api', apiNotFound);

// Global API error handler
app.use(errorHandler);

// ── Frontend Static Assets & SPA Fallback ───────────────────────────────────

const distDir = path.join(repoRoot, 'dist');
app.use(express.static(distDir, { maxAge: '1h' }));

// SPA client-side routing fallback: serve index.html for non-API routes
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return next();
  }
  const indexHtml = path.join(distDir, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      // If dist/index.html is not yet built, serve a minimal holding shell
      res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>ThinkTank Academia</title>
</head>
<body style="font-family:Georgia,serif;background:#f7f2e8;color:#071b33;margin:0;padding:3rem;text-align:center;">
  <p style="letter-spacing:0.2em;color:#987029;font-size:0.8rem;font-weight:600;">THINKTANK ACADEMIA</p>
  <h1 style="font-size:2.4rem;margin:0.5rem 0;">Learn • Think • Understand • Unite</h1>
  <p style="color:#526173;max-width:540px;margin:1rem auto;line-height:1.6;">A multidisciplinary learning and knowledge platform for education, ideas, and humanity.</p>
  <div style="margin-top:2rem;">
    <a href="/api/v1/home" style="display:inline-block;background:#071b33;color:#d4b274;padding:0.75rem 1.5rem;text-decoration:none;font-weight:600;border-radius:3px;margin:0 0.5rem;">API Discovery</a>
    <a href="/api/health" style="display:inline-block;background:#fff;color:#071b33;border:1px solid #cdd4dc;padding:0.75rem 1.5rem;text-decoration:none;font-weight:600;border-radius:3px;margin:0 0.5rem;">Health Check</a>
  </div>
</body>
</html>`);
    }
  });
});

// ── Server Lifecycle ────────────────────────────────────────────────────────

let scheduledTimer: NodeJS.Timeout | null = null;
let tickCount = 0;

export async function start(port = config.port) {
  await initPool();
  await seedDatabase();

  // Issue (or keep) the current hacker-admin passcode and e-mail a new one
  // whenever the rotation window (default: 1 hour) elapses.
  try {
    await ensurePasscode('BOOT');
  } catch (error) {
    logger.error('hackeradmin: could not initialise the passcode', { message: (error as Error).message });
  }

  // Run scheduled publisher + passcode rotation check every 60 seconds;
  // traffic-log retention pruning runs every 10th tick (~10 minutes).
  if (!isTest) {
    scheduledTimer = setInterval(() => {
      tickCount += 1;
      publishScheduled().catch((e) => logger.error('scheduled publisher error', { message: e.message }));
      ensurePasscode('ROTATION').catch((e) => logger.error('hackeradmin: rotation check failed', { message: e.message }));
      if (tickCount % 10 === 0) pruneRequestLog().catch(() => undefined);
    }, 60_000);
  }

  return new Promise<any>((resolve) => {
    const server = app.listen(port, '0.0.0.0', () => {
      logger.info(`ThinkTank Academia listening on port ${port} (${config.env})`);
      resolve(server);
    });
  });
}

export async function stop(server?: any) {
  if (scheduledTimer) clearInterval(scheduledTimer);
  if (server && typeof server.close === 'function') {
    await new Promise<void>((r) => server.close(() => r()));
  }
  await closePool();
}

// Auto-start only when executed as the main process
const isMain = process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));
if (isMain && !isTest) {
  start().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}
