import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.ts';
import { all, count, one, run } from '../db/index.ts';
import { ok, parse, route } from '../lib/http.ts';
import { logger } from '../lib/logger.ts';
import { sendMail } from '../lib/messaging.ts';
import { unauthorized } from '../lib/errors.ts';
import {
  ensurePasscode,
  issuePasscode,
  signHackerToken,
  stateInfo,
  validatePasscode,
  verifyHackerToken,
} from '../services/hackeradmin.ts';
import { getSiteSwitch, setSiteSwitch } from '../lib/site-status.ts';

const param = (p: unknown): string => (Array.isArray(p) ? String(p[0] ?? '') : String(p ?? ''));

export const hackerAdminRoutes = Router();

// ── Authentication ─────────────────────────────────────────────────────────

hackerAdminRoutes.use(
  rateLimit({
    windowMs: 15 * 60_000,
    limit: config.hackerAdmin.maxLoginAttempts * 3,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests to the operations console.' } },
  }),
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: Math.max(5, config.hackerAdmin.maxLoginAttempts),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many passcode attempts. Try again in a few minutes.' } },
});

/** Bearer token guard for every authenticated endpoint. */
function hackerAuth(req: any, _res: any, next: any): void {
  const header = String(req.headers.authorization ?? '');
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token || !verifyHackerToken(token)) {
    return next(unauthorized('Invalid or expired operations session. Re-enter the passcode.'));
  }
  next();
}

/** Non-secret rotation state — safe before login (drives the login screen). */
hackerAdminRoutes.get(
  '/status',
  route(async (_req, res) => {
    ok(res, await stateInfo());
  }),
);

hackerAdminRoutes.post(
  '/login',
  loginLimiter,
  route(async (req, res) => {
    if (!config.hackerAdmin.enabled) throw unauthorized('The operations console is disabled in this deployment.');
    const data = parse(z.object({ passcode: z.string().min(4).max(24) }), req.body);
    const result = await validatePasscode(data.passcode);
    if (!result.ok || !result.state) {
      const messages: Record<string, string> = {
        EMPTY: 'Enter the passcode from the e-mail.',
        INVALID: 'That passcode is incorrect or from an older window. A fresh code is e-mailed every hour.',
        EXPIRED: 'That passcode has expired. A new one has just been e-mailed.',
        NO_CODE_ISSUED: 'No passcode has been issued yet — check the server log.',
      };
      throw unauthorized(messages[result.reason ?? 'INVALID'] ?? 'Passcode rejected.');
    }
    const session = signHackerToken(result.state);
    logger.warn('hackeradmin: operator logged in', { ip: (req as any).ip });
    ok(res, { token: session.token, expiresAt: session.expiresAt, state: { issuedAt: result.state.issuedAt, expiresAt: result.state.expiresAt, rotations: result.state.rotations } });
  }),
);

// Everything below requires a valid operations session.
hackerAdminRoutes.use(hackerAuth);

// ── Overview / management ──────────────────────────────────────────────────

hackerAdminRoutes.get(
  '/overview',
  route(async (_req, res) => {
    const [users, admins, superAdmins, courses, publishedCourses, content, books, quizzes, enrollments, attempts, newMessages, subscribers] =
      await Promise.all([
        count('users'),
        count('users', 'role_id IN (SELECT id FROM roles WHERE level >= 2)'),
        count('users', "role_id IN (SELECT id FROM roles WHERE name = 'SUPER_ADMIN')"),
        count('courses'),
        count('courses', "status = 'PUBLISHED'"),
        count('content'),
        count('books'),
        count('quizzes'),
        count('enrollments'),
        count('attempts', "status = 'SUBMITTED'"),
        count('contacts', "status = 'NEW'"),
        count('subscribers', "status = 'SUBSCRIBED'"),
      ]);

    const switchState = await getSiteSwitch(true);
    const state = await stateInfo();

    ok(res, {
      site: switchState,
      hacker: state,
      uptime_seconds: Math.floor(process.uptime()),
      node: process.version,
      env: config.env,
      stats: {
        users,
        admins,
        super_admins: superAdmins,
        courses,
        published_courses: publishedCourses,
        content,
        books,
        quizzes,
        enrollments,
        attempts,
        new_messages: newMessages,
        subscribers,
      },
    });
  }),
);

// ── Traffic ────────────────────────────────────────────────────────────────

const SINCE = (hours: number) => `(strftime('%Y-%m-%dT%H:%M:%fZ','now','-${hours} hours'))`;

hackerAdminRoutes.get(
  '/traffic',
  route(async (_req, res) => {
    const [totals, byDay, statusBuckets, topPaths, recent, kindSplit] = await Promise.all([
      one<{
        last_hour: number;
        last_24h: number;
        last_7d: number;
        total: number;
      }>(
        `SELECT
           COUNT(CASE WHEN created_at >= (strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hours')) THEN 1 END)::int AS last_hour,
           COUNT(CASE WHEN created_at >= (strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours')) THEN 1 END)::int AS last_24h,
           COUNT(CASE WHEN created_at >= (strftime('%Y-%m-%dT%H:%M:%fZ','now','-168 hours')) THEN 1 END)::int AS last_7d,
           COUNT(*)::int AS total
         FROM request_log`,
      ),
      all<{ day: string; total: number }>(
        `SELECT substr(created_at, 1, 10) AS day, COUNT(*)::int AS total
           FROM request_log
          WHERE created_at >= (strftime('%Y-%m-%dT%H:%M:%fZ','now','-14 days'))
          GROUP BY day ORDER BY day ASC`,
      ),
      all<{ bucket: string; total: number }>(
        `SELECT
           CASE
             WHEN status >= 500 THEN '5xx server'
             WHEN status >= 400 THEN '4xx client'
             WHEN status >= 300 THEN '3xx redirect'
             ELSE '2xx ok'
           END AS bucket,
           COUNT(*)::int AS total
         FROM request_log
        WHERE created_at >= (strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours'))
        GROUP BY bucket`,
      ),
      all<{ path: string; total: number; avg_ms: number; errors: number }>(
        `SELECT path,
                COUNT(*)::int AS total,
                ROUND(AVG(duration_ms), 1) AS avg_ms,
                COUNT(CASE WHEN status >= 400 THEN 1 END)::int AS errors
           FROM request_log
          WHERE created_at >= (strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours'))
          GROUP BY path ORDER BY total DESC LIMIT 15`,
      ),
      all<Record<string, any>>(
        `SELECT method, path, status, ip, user_agent, duration_ms, is_api, created_at
           FROM request_log ORDER BY created_at DESC LIMIT 50`,
      ),
      all<{ kind: string; total: number }>(
        `SELECT CASE WHEN is_api = 1 THEN 'API' ELSE 'Page' END AS kind, COUNT(*)::int AS total
           FROM request_log
          WHERE created_at >= (strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours'))
          GROUP BY kind`,
      ),
    ]);

    ok(res, {
      totals: totals ?? { last_hour: 0, last_24h: 0, last_7d: 0, total: 0 },
      by_day: byDay,
      status_24h: statusBuckets,
      api_vs_pages_24h: kindSplit,
      top_paths_24h: topPaths,
      recent: recent,
    });
  }),
);

// ── Visitors ───────────────────────────────────────────────────────────────

hackerAdminRoutes.get(
  '/visitors',
  route(async (_req, res) => {
    const unique = async (label: string, hours: number) =>
      one<{ total: number }>(
        `SELECT COUNT(DISTINCT ip)::int AS total FROM request_log WHERE ip != '' AND created_at >= ${SINCE(hours)}`,
      ).then((row) => ({ label, total: Number(row?.total ?? 0) }));

    const [hour, day, week, byDay, topUa, topRef, topIps] = await Promise.all([
      unique('Last hour', 1),
      unique('Last 24 hours', 24),
      unique('Last 7 days', 168),
      all<{ day: string; visitors: number; requests: number }>(
        `SELECT substr(created_at, 1, 10) AS day,
                COUNT(DISTINCT ip)::int AS visitors,
                COUNT(*)::int AS requests
           FROM request_log
          WHERE ip != '' AND created_at >= (strftime('%Y-%m-%dT%H:%M:%fZ','now','-14 days'))
          GROUP BY day ORDER BY day ASC`,
      ),
      all<{ user_agent: string; total: number }>(
        `SELECT user_agent, COUNT(*)::int AS total
           FROM request_log
          WHERE created_at >= (strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours')) AND user_agent != ''
          GROUP BY user_agent ORDER BY total DESC LIMIT 10`,
      ),
      all<{ referrer: string; total: number }>(
        `SELECT referrer, COUNT(*)::int AS total
           FROM request_log
          WHERE created_at >= (strftime('%Y-%m-%dT%H:%M:%fZ','now','-168 hours')) AND referrer != ''
          GROUP BY referrer ORDER BY total DESC LIMIT 10`,
      ),
      all<{ ip: string; requests: number; first_seen: string; last_seen: string }>(
        `SELECT ip,
                COUNT(*)::int AS requests,
                MIN(created_at) AS first_seen,
                MAX(created_at) AS last_seen
           FROM request_log
          WHERE ip != '' AND created_at >= (strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours'))
          GROUP BY ip ORDER BY requests DESC LIMIT 20`,
      ),
    ]);

    ok(res, {
      unique_visitors: [hour, day, week],
      by_day: byDay,
      top_user_agents_24h: topUa,
      top_referrers_7d: topRef,
      top_ips_24h: topIps,
    });
  }),
);

// ── Admins & super admin ───────────────────────────────────────────────────

hackerAdminRoutes.get(
  '/admins',
  route(async (_req, res) => {
    const rows = await all<Record<string, any>>(
      `SELECT u.id, u.name, u.email, u.is_active, u.last_login_at, u.created_at,
              r.id AS role_id, r.name AS role_name, r.label AS role_label, r.level AS role_level
         FROM users u
         JOIN roles r ON r.id = u.role_id
        WHERE r.level >= 2
        ORDER BY r.level DESC, u.created_at ASC`,
    );
    const admins = rows.map((row) => ({ ...row, is_active: Boolean(row.is_active) }));
    ok(res, admins);
  }),
);

hackerAdminRoutes.get(
  '/superadmin',
  route(async (_req, res) => {
    const rows = await all<Record<string, any>>(
      `SELECT u.id, u.name, u.email, u.is_active, u.last_login_at, u.created_at
         FROM users u
         JOIN roles r ON r.id = u.role_id
        WHERE r.name = 'SUPER_ADMIN'
        ORDER BY u.created_at ASC`,
    );
    const superAdmins = rows.map((row): Record<string, any> => ({ ...row, is_active: Boolean(row.is_active) }));
    const configured = {
      email: config.superAdmin.email || null,
      envVar: 'SUPER_ADMIN_EMAIL',
      configuredInEnv: Boolean(config.superAdmin.email && config.superAdmin.password),
      presentInDatabase: superAdmins.some((row) => row.email === config.superAdmin.email),
    };
    ok(res, { super_admins: superAdmins, configured });
  }),
);

// ── Activity log ───────────────────────────────────────────────────────────

hackerAdminRoutes.get(
  '/activity',
  route(async (req, res) => {
    const limit = Math.min(100, Math.max(10, Number.parseInt(param(req.query.limit) || '30', 10) || 30));
    const rows = await all<Record<string, any>>(
      `SELECT id, actor_name, action, entity_type, entity_label, created_at
         FROM activity_log ORDER BY created_at DESC, id DESC LIMIT $1`,
      [limit],
    );
    ok(res, rows.map((row) => ({ ...row, meta: null })));
  }),
);

// ── Site on/off (kill switch) ──────────────────────────────────────────────

hackerAdminRoutes.post(
  '/site/toggle',
  route(async (req, res) => {
    const data = parse(
      z.object({ enabled: z.boolean(), note: z.string().trim().max(300).optional() }),
      req.body,
    );
    const previous = await getSiteSwitch(true);
    const switchState = await setSiteSwitch(data.enabled, 'hacker-admin', data.note ?? '');
    ok(res, {
      previous: previous.enabled,
      current: switchState,
      changed: previous.enabled !== data.enabled,
    });
  }),
);

// ── Passcode operations ────────────────────────────────────────────────────

hackerAdminRoutes.post(
  '/passcode/regenerate',
  route(async (_req, res) => {
    const issued = await issuePasscode('MANUAL');
    logger.warn('hackeradmin: passcode manually rotated by operator');
    ok(res, {
      issuedAt: issued.state.issuedAt,
      expiresAt: issued.state.expiresAt,
      rotations: issued.state.rotations,
      mailDelivered: issued.mailDelivered,
      mailTo: config.hackerAdmin.email,
    });
  }),
);

hackerAdminRoutes.post(
  '/mail/test',
  route(async (_req, res) => {
    const state = await ensurePasscode('ROTATION');
    const info = await stateInfo();
    const result = await sendMail(
      config.hackerAdmin.email,
      'ThinkTank Academia — operations console test e-mail',
      `<div style="font-family:ui-monospace,Menlo,monospace;max-width:560px;margin:0 auto;padding:24px;border:1px solid #243447;background:#0b1420;color:#dbe7f3">
        <p style="letter-spacing:.22em;font-size:12px;color:#7dd3fc;margin:0 0 12px">THINKTANK ACADEMIA — OPERATIONS</p>
        <h1 style="font-size:22px;color:#f8fafc;margin:0 0 16px">SMTP is working</h1>
        <p style="line-height:1.7">This test e-mail was sent from the /hackeradmin console at ${new Date().toUTCString()}.</p>
        <p style="line-height:1.7">Current passcode window expires ${new Date(state.expiresAt).toUTCString()}.</p>
      </div>`,
      `SMTP test from the ThinkTank Academia operations console.\nSent: ${new Date().toUTCString()}\nCurrent passcode window expires: ${new Date(state.expiresAt).toUTCString()}`,
      'HACKER_ADMIN',
    );
    ok(res, {
      delivered: result.delivered,
      reason: result.reason ?? null,
      to: config.hackerAdmin.email,
      mailConfigured: info.mailConfigured,
    });
  }),
);

// ── Health of the console itself ───────────────────────────────────────────

hackerAdminRoutes.get(
  '/health',
  route(async (_req, res) => {
    const row = await one<{ total: number }>('SELECT COUNT(*)::int AS total FROM hacker_admin_state');
    ok(res, { ok: true, tablePresent: Number(row?.total ?? 0) >= 0, timestamp: new Date().toISOString() });
  }),
);
