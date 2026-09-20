/**
 * Super Admin console — system & operations APIs.
 *
 * Mounted inside the admin router (so every endpoint inherits `adminOnly()`):
 *   GET  /system/health          — runtime, database, services & traffic snapshot
 *   GET  /system/api-logs        — request_log analytics + paginated access/error log
 *   GET  /email/overview         — SMTP configuration, delivery stats & audience counts
 *   POST /email/send             — send an administrative e-mail (audited)
 *   GET  /email/logs             — paginated outgoing-mail audit trail
 *   GET  /security/overview      — accounts, roles, devices, resets & failed logins
 *   GET  /audit-logs             — searchable / filterable activity_log feed
 *   GET  /backups                — list backup snapshots
 *   POST /backups                — create a JSON snapshot of the database
 *   GET  /backups/:id/download   — download a snapshot
 *   DEL  /backups/:id            — delete a snapshot
 */
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config, repoRoot, mailEnabled, pushEnabled } from '../config.ts';
import { all, count, insert, one, run, inMemory, fileBacked } from '../db/index.ts';
import { notFound } from '../lib/errors.ts';
import { like, ok, paged, pagination, parse, route } from '../lib/http.ts';
import { json, newId } from '../lib/util.ts';
import { sanitizePlainText } from '../lib/sanitize.ts';
import { requirePermission } from '../middleware/auth.ts';
import { sendMail } from '../lib/messaging.ts';
import { logActivity } from '../services/notifications.ts';
import { getSiteSwitch } from '../lib/site-status.ts';
import { SCHEMA_VERSION } from '../db/schema.ts';

export const adminSystemRoutes = Router();

/** SQLite-compatible "hours ago" expression (ISO-8601 timestamps compare lexically). */
const SINCE = (hours: number) => `(strftime('%Y-%m-%dT%H:%M:%fZ','now','-${hours} hours'))`;

const emailLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many e-mails sent. Please wait a few minutes.' } },
});

// ── System Health ───────────────────────────────────────────────────────────

function databaseFileStats(): { path: string; bytes: number } | null {
  try {
    let file: string | null = null;
    if (config.databaseUrl && config.databaseUrl.startsWith('file:') && !config.databaseUrl.includes(':memory:')) {
      file = config.databaseUrl.slice('file:'.length);
    } else if (!config.databaseUrl) {
      file = path.join(repoRoot, 'data', 'thinktank.sqlite');
    }
    if (!file) return null;
    const stats = fs.statSync(file);
    return { path: file, bytes: stats.size };
  } catch {
    return null;
  }
}

adminSystemRoutes.get(
  '/system/health',
  route(async (_req, res) => {
    const memory = process.memoryUsage();
    const tableNames = [
      'users',
      'roles',
      'courses',
      'modules',
      'lessons',
      'enrollments',
      'assignments',
      'quizzes',
      'questions',
      'attempts',
      'content',
      'books',
      'categories',
      'media',
      'notifications',
      'contacts',
      'subscribers',
      'activity_log',
      'request_log',
      'smtp_log',
    ];
    const tableCounts: Record<string, number> = {};
    for (const table of tableNames) {
      tableCounts[table] = await count(table).catch(() => 0);
    }

    const [traffic, scheduledCourses, scheduledContent, pendingMessages, backupStats, siteSwitch] = await Promise.all([
      one<{ requests: number; errors: number; avg_ms: number }>(
        `SELECT COUNT(*)::int AS requests,
                COUNT(CASE WHEN status >= 400 THEN 1 END)::int AS errors,
                ROUND(AVG(duration_ms), 1) AS avg_ms
           FROM request_log WHERE created_at >= ${SINCE(24)}`,
      ),
      count('courses', "status = 'SCHEDULED'").catch(() => 0),
      count('content', "status = 'SCHEDULED'").catch(() => 0),
      count('contacts', "status = 'NEW'").catch(() => 0),
      one<{ total: number; bytes: number; last_at: string | null }>(
        'SELECT COUNT(*)::int AS total, COALESCE(SUM(size_bytes), 0)::int AS bytes, MAX(created_at) AS last_at FROM backups',
      ),
      getSiteSwitch().catch(() => ({ enabled: true, note: '', updatedBy: 'system', updatedAt: '' })),
    ]);

    const dbFile = databaseFileStats();
    const dbMode = inMemory ? 'memory' : config.databaseUrl?.startsWith('libsql://') ? 'turso' : 'file';

    ok(res, {
      runtime: {
        env: config.env,
        node_version: process.version,
        platform: `${process.platform} ${process.arch}`,
        uptime_seconds: Math.round(process.uptime()),
        process_id: process.pid,
        memory: {
          rss_mb: Math.round((memory.rss / 1024 / 1024) * 10) / 10,
          heap_used_mb: Math.round((memory.heapUsed / 1024 / 1024) * 10) / 10,
          heap_total_mb: Math.round((memory.heapTotal / 1024 / 1024) * 10) / 10,
        },
      },
      database: {
        mode: dbMode,
        schema_version: SCHEMA_VERSION,
        file: dbFile ? { path: dbFile.path, size_mb: Math.round((dbFile.bytes / 1024 / 1024) * 100) / 100 } : null,
      },
      services: {
        mail: { enabled: mailEnabled, host: config.smtp.host || null, secure: config.smtp.secure },
        push: { enabled: pushEnabled, project: config.firebase.projectId || null },
        storage: { driver: config.storage.driver },
        hacker_admin: { enabled: config.hackerAdmin.enabled },
      },
      traffic_24h: {
        requests: Number(traffic?.requests ?? 0),
        errors: Number(traffic?.errors ?? 0),
        avg_ms: Number(traffic?.avg_ms ?? 0),
      },
      operations: {
        scheduled_courses: scheduledCourses,
        scheduled_content: scheduledContent,
        pending_messages: pendingMessages,
        site_switch: siteSwitch,
        backups: {
          total: Number(backupStats?.total ?? 0),
          total_bytes: Number(backupStats?.bytes ?? 0),
          last_at: backupStats?.last_at ?? null,
        },
      },
      table_counts: tableCounts,
    });
  }),
);

// ── API & Error Logs ────────────────────────────────────────────────────────

adminSystemRoutes.get(
  '/system/api-logs',
  route(async (req, res) => {
    const page = pagination(req.query as Record<string, unknown>, 20, 100);
    const view = String(req.query.view ?? 'all'); // all | errors | slow | server
    const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const method = typeof req.query.method === 'string' ? req.query.method.toUpperCase() : '';

    const where: string[] = [];
    const params: unknown[] = [];
    if (view === 'errors') where.push('status >= 400');
    if (view === 'server') where.push('status >= 500');
    if (view === 'slow') where.push('duration_ms >= 800');
    if (method) {
      params.push(method);
      where.push(`method = $${params.length}`);
    }
    if (term) {
      params.push(like(term));
      where.push(`(path LIKE $${params.length} OR ip LIKE $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [totalRow, rows, totals, buckets, slowest, topErrors] = await Promise.all([
      one<{ total: number }>(`SELECT COUNT(*)::int AS total FROM request_log ${whereSql}`, params),
      all<Record<string, any>>(
        `SELECT id, method, path, status, ip, user_agent, referrer, duration_ms, is_api, user_id, created_at
           FROM request_log ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, page.limit, page.offset],
      ),
      one<{ last_hour: number; last_24h: number; errors_24h: number; server_24h: number; avg_ms: number; max_ms: number }>(
        `SELECT COUNT(CASE WHEN created_at >= ${SINCE(1)} THEN 1 END)::int AS last_hour,
                COUNT(CASE WHEN created_at >= ${SINCE(24)} THEN 1 END)::int AS last_24h,
                COUNT(CASE WHEN status >= 400 AND created_at >= ${SINCE(24)} THEN 1 END)::int AS errors_24h,
                COUNT(CASE WHEN status >= 500 AND created_at >= ${SINCE(24)} THEN 1 END)::int AS server_24h,
                ROUND(AVG(CASE WHEN created_at >= ${SINCE(24)} THEN duration_ms END), 1) AS avg_ms,
                MAX(CASE WHEN created_at >= ${SINCE(24)} THEN duration_ms END) AS max_ms
           FROM request_log`,
      ),
      all<{ bucket: string; total: number }>(
        `SELECT CASE
                  WHEN status >= 500 THEN '5xx'
                  WHEN status >= 400 THEN '4xx'
                  WHEN status >= 300 THEN '3xx'
                  ELSE '2xx' END AS bucket,
                COUNT(*)::int AS total
           FROM request_log WHERE created_at >= ${SINCE(24)}
          GROUP BY bucket ORDER BY bucket`,
      ),
      all<{ path: string; total: number; avg_ms: number; max_ms: number }>(
        `SELECT path, COUNT(*)::int AS total, ROUND(AVG(duration_ms), 1) AS avg_ms, MAX(duration_ms) AS max_ms
           FROM request_log WHERE created_at >= ${SINCE(24)}
          GROUP BY path HAVING COUNT(*) >= 3 ORDER BY avg_ms DESC LIMIT 8`,
      ),
      all<{ path: string; total: number; statuses: number }>(
        `SELECT path, COUNT(*)::int AS total, COUNT(CASE WHEN status >= 500 THEN 1 END)::int AS statuses
           FROM request_log WHERE status >= 500 AND created_at >= ${SINCE(168)}
          GROUP BY path ORDER BY total DESC LIMIT 8`,
      ),
    ]);

    ok(res, {
      ...paged(rows, page, Number(totalRow?.total ?? 0)),
      stats: {
        last_hour: Number(totals?.last_hour ?? 0),
        last_24h: Number(totals?.last_24h ?? 0),
        errors_24h: Number(totals?.errors_24h ?? 0),
        server_24h: Number(totals?.server_24h ?? 0),
        avg_ms: Number(totals?.avg_ms ?? 0),
        max_ms: Number(totals?.max_ms ?? 0),
        retention_days: 7,
      },
      status_buckets_24h: buckets,
      slowest_endpoints_24h: slowest,
      top_server_errors_7d: topErrors,
    });
  }),
);

// ── Email Center ────────────────────────────────────────────────────────────

adminSystemRoutes.get(
  '/email/overview',
  route(async (_req, res) => {
    const [stats7, stats30, recent, subscribers, pendingContacts, recentBroadcasts] = await Promise.all([
      one<{ sent: number; failed: number; skipped: number }>(
        `SELECT COUNT(CASE WHEN status = 'SENT' THEN 1 END)::int AS sent,
                COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::int AS failed,
                COUNT(CASE WHEN status = 'SKIPPED' THEN 1 END)::int AS skipped
           FROM smtp_log WHERE created_at >= ${SINCE(168)}`,
      ),
      one<{ sent: number; failed: number; skipped: number }>(
        `SELECT COUNT(CASE WHEN status = 'SENT' THEN 1 END)::int AS sent,
                COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::int AS failed,
                COUNT(CASE WHEN status = 'SKIPPED' THEN 1 END)::int AS skipped
           FROM smtp_log WHERE created_at >= ${SINCE(720)}`,
      ),
      all<Record<string, any>>('SELECT id, to_email, subject, kind, status, error, created_at FROM smtp_log ORDER BY created_at DESC LIMIT 12'),
      count('subscribers', "status = 'SUBSCRIBED'").catch(() => 0),
      count('contacts', "status = 'NEW'").catch(() => 0),
      all<Record<string, any>>(
        `SELECT id, title, message, type, link, created_at FROM notifications WHERE audience = 'ALL' ORDER BY created_at DESC LIMIT 6`,
      ),
    ]);

    ok(res, {
      smtp: {
        configured: mailEnabled,
        host: config.smtp.host || null,
        port: config.smtp.port,
        secure: config.smtp.secure,
        from: config.smtp.from,
        user: config.smtp.user ? `${config.smtp.user.slice(0, 3)}••••` : null,
      },
      delivery: {
        last_7d: { sent: Number(stats7?.sent ?? 0), failed: Number(stats7?.failed ?? 0), skipped: Number(stats7?.skipped ?? 0) },
        last_30d: { sent: Number(stats30?.sent ?? 0), failed: Number(stats30?.failed ?? 0), skipped: Number(stats30?.skipped ?? 0) },
      },
      audience: {
        subscribers: subscribers,
        pending_messages: pendingContacts,
      },
      recent_sends: recent,
      recent_broadcasts: recentBroadcasts,
    });
  }),
);

adminSystemRoutes.post(
  '/email/send',
  requirePermission('notifications:send'),
  emailLimiter,
  route(async (req, res) => {
    const data = parse(
      z.object({
        to: z.string().trim().toLowerCase().email('Enter a valid recipient address.'),
        subject: z.string().trim().min(3).max(200),
        message: z.string().trim().min(1).max(8000),
      }),
      req.body,
    );

    const safeMessage = sanitizePlainText(data.message);
    const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e0d5">
      <p style="letter-spacing:.18em;font-size:12px;color:#987029;margin:0 0 12px">THINKTANK ACADEMIA</p>
      <h1 style="font-size:22px;color:#071b33;margin:0 0 16px">${sanitizePlainText(data.subject)}</h1>
      <p style="line-height:1.8;color:#33414f;white-space:pre-line">${safeMessage}</p>
      <p style="margin-top:28px;font-size:12px;color:#8a94a4">Sent by the ThinkTank Academia team through the Super Admin console.</p>
    </div>`;

    const result = await sendMail(data.to, data.subject, html, safeMessage, 'ADMIN');
    // sendMail already records the attempt; attach the actor for the audit trail.
    await logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      action: 'ADMIN_EMAIL_SENT',
      entityType: 'EMAIL',
      entityId: data.to,
      entityLabel: data.subject,
      meta: { delivered: result.delivered, reason: result.reason ?? null },
    });

    ok(res, { delivered: result.delivered, reason: result.reason ?? null, to: data.to }, 201);
  }),
);

adminSystemRoutes.get(
  '/email/logs',
  route(async (req, res) => {
    const page = pagination(req.query as Record<string, unknown>, 20, 100);
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : '';
    const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const where: string[] = [];
    const params: unknown[] = [];
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (term) {
      params.push(like(term));
      where.push(`(to_email LIKE $${params.length} OR subject LIKE $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [totalRow, rows, counts] = await Promise.all([
      one<{ total: number }>(`SELECT COUNT(*)::int AS total FROM smtp_log ${whereSql}`, params),
      all<Record<string, any>>(
        `SELECT * FROM smtp_log ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, page.limit, page.offset],
      ),
      one<{ sent: number; failed: number; skipped: number }>(
        `SELECT COUNT(CASE WHEN status = 'SENT' THEN 1 END)::int AS sent,
                COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::int AS failed,
                COUNT(CASE WHEN status = 'SKIPPED' THEN 1 END)::int AS skipped
           FROM smtp_log`,
      ),
    ]);

    ok(res, {
      ...paged(rows, page, Number(totalRow?.total ?? 0)),
      totals: {
        sent: Number(counts?.sent ?? 0),
        failed: Number(counts?.failed ?? 0),
        skipped: Number(counts?.skipped ?? 0),
      },
    });
  }),
);

// ── Security Overview ───────────────────────────────────────────────────────

adminSystemRoutes.get(
  '/security/overview',
  route(async (_req, res) => {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      verifiedUsers,
      pendingResets,
      devices,
      recentDevices,
      failed24h,
      failedRecent,
      roleRows,
      recentAdminActions,
    ] = await Promise.all([
      count('users'),
      count('users', 'is_active = 1'),
      count('users', 'is_active = 0'),
      count('users', 'email_verified = 1'),
      one<{ total: number }>(`SELECT COUNT(*)::int AS total FROM password_resets WHERE used_at IS NULL AND expires_at > (strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
      count('user_devices'),
      all<Record<string, any>>(
        `SELECT d.id, d.platform, d.created_at, u.name AS user_name, u.email AS user_email
           FROM user_devices d JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC LIMIT 8`,
      ),
      one<{ total: number }>(`SELECT COUNT(*)::int AS total FROM activity_log WHERE action = 'LOGIN_FAILED' AND created_at >= ${SINCE(24)}`),
      all<Record<string, any>>(
        `SELECT id, actor_name, entity_label, meta, created_at FROM activity_log WHERE action = 'LOGIN_FAILED' ORDER BY created_at DESC LIMIT 10`,
      ),
      all<{ id: string; label: string; name: string; level: number; users: number }>(
        `SELECT r.id, r.label, r.name, r.level, COUNT(u.id)::int AS users
           FROM roles r LEFT JOIN users u ON u.role_id = r.id
          GROUP BY r.id ORDER BY r.level DESC`,
      ),
      all<Record<string, any>>(
        `SELECT id, actor_name, action, entity_type, entity_label, created_at FROM activity_log
          WHERE action IN ('USER_UPDATED','USER_DELETED','ROLE_PERMISSIONS_UPDATED','SETTINGS_UPDATED','BROADCAST_SENT','ADMIN_EMAIL_SENT','LOGGED_IN')
          ORDER BY created_at DESC LIMIT 10`,
      ),
    ]);

    ok(res, {
      accounts: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        verified: verifiedUsers,
      },
      authentication: {
        pending_password_resets: Number(pendingResets?.total ?? 0),
        failed_logins_24h: Number(failed24h?.total ?? 0),
        recent_failed_logins: failedRecent,
      },
      devices: {
        total: devices,
        recent: recentDevices,
      },
      roles: roleRows,
      posture: {
        jwt_secret_ephemeral: config.jwt.secretIsEphemeral,
        jwt_expires_in: config.jwt.expiresIn,
        reset_token_ttl_minutes: config.jwt.resetTokenTtlMinutes,
        rate_limit: { window_minutes: Math.round(config.rateLimit.windowMs / 60_000), max: config.rateLimit.max },
        environment: config.env,
        mail_enabled: mailEnabled,
        push_enabled: pushEnabled,
        storage_driver: config.storage.driver,
        password_hash: 'bcrypt',
      },
      recent_admin_actions: recentAdminActions,
    });
  }),
);

// ── Audit Logs ──────────────────────────────────────────────────────────────

adminSystemRoutes.get(
  '/audit-logs',
  route(async (req, res) => {
    const page = pagination(req.query as Record<string, unknown>, 25, 100);
    const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const action = typeof req.query.action === 'string' ? req.query.action.trim().toUpperCase() : '';
    const entityType = typeof req.query.entity_type === 'string' ? req.query.entity_type.trim().toUpperCase() : '';

    const where: string[] = [];
    const params: unknown[] = [];
    if (action) {
      params.push(action);
      where.push(`action = $${params.length}`);
    }
    if (entityType) {
      params.push(entityType);
      where.push(`entity_type = $${params.length}`);
    }
    if (term) {
      params.push(like(term));
      where.push(`(actor_name LIKE $${params.length} OR action LIKE $${params.length} OR entity_label LIKE $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [totalRow, rows, actionTypes, entityTypes] = await Promise.all([
      one<{ total: number }>(`SELECT COUNT(*)::int AS total FROM activity_log ${whereSql}`, params),
      all<Record<string, any>>(
        `SELECT * FROM activity_log ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, page.limit, page.offset],
      ),
      all<{ action: string }>('SELECT DISTINCT action FROM activity_log ORDER BY action LIMIT 60'),
      all<{ entity_type: string }>('SELECT DISTINCT entity_type FROM activity_log WHERE entity_type != \'\' ORDER BY entity_type LIMIT 40'),
    ]);

    ok(res, {
      ...paged(rows, page, Number(totalRow?.total ?? 0)),
      filters: {
        actions: actionTypes.map((row) => row.action),
        entity_types: entityTypes.map((row) => row.entity_type),
      },
    });
  }),
);

// ── Backups ─────────────────────────────────────────────────────────────────

const BACKUP_TABLES = [
  'roles',
  'permissions',
  'role_permissions',
  'users',
  'categories',
  'courses',
  'modules',
  'lessons',
  'enrollments',
  'lesson_progress',
  'assignments',
  'assignment_submissions',
  'quizzes',
  'questions',
  'quiz_questions',
  'attempts',
  'content',
  'books',
  'bookmarks',
  'notifications',
  'media',
  'settings',
  'contacts',
  'subscribers',
  'activity_log',
] as const;

function backupsDir(): string {
  const dir = path.join(repoRoot, 'data', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function backupFilePath(filename: string): string {
  // Defence in depth: never let a stored filename escape the backups directory.
  const safe = path.basename(filename);
  return path.join(backupsDir(), safe);
}

function maskSecrets(row: Record<string, any>): Record<string, any> {
  const masked = { ...row };
  if (typeof masked.password_hash === 'string') masked.password_hash = `bcrypt:${masked.password_hash.length}chars`;
  if (typeof masked.token_hash === 'string') masked.token_hash = `sha256:${masked.token_hash.length}chars`;
  if (typeof masked.token === 'string') masked.token = `${String(masked.token).slice(0, 6)}…redacted`;
  if (typeof masked.passcode_hash === 'string') masked.passcode_hash = 'redacted';
  return masked;
}

adminSystemRoutes.get(
  '/backups',
  route(async (_req, res) => {
    const rows = await all<Record<string, any>>('SELECT * FROM backups ORDER BY created_at DESC LIMIT 100');
    ok(res, {
      items: rows.map((row) => ({
        ...row,
        table_counts: typeof row.table_counts === 'string' ? JSON.parse(row.table_counts || '{}') : row.table_counts || {},
        file_exists: fs.existsSync(backupFilePath(row.filename)),
      })),
      directory: 'data/backups',
    });
  }),
);

adminSystemRoutes.post(
  '/backups',
  requirePermission('settings:write'),
  route(async (req, res) => {
    const note = sanitizePlainText(String((req.body as any)?.note ?? '')).slice(0, 200);

    const payload: Record<string, unknown> = {
      meta: {
        platform: 'ThinkTank Academia',
        schema_version: SCHEMA_VERSION,
        created_at: new Date().toISOString(),
        created_by: req.user!.name,
        note,
      },
      tables: {} as Record<string, unknown[]>,
    };

    const tables = payload.tables as Record<string, unknown[]>;
    for (const table of BACKUP_TABLES) {
      const rows = await all(`SELECT * FROM ${table}`).catch(() => []);
      tables[table] = rows.map(maskSecrets);
    }

    const id = newId();
    const filename = `thinktank-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
    const filePath = backupFilePath(filename);
    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf8');
    const sizeBytes = fs.statSync(filePath).size;

    const tableCounts: Record<string, number> = {};
    for (const [table, rows] of Object.entries(tables)) tableCounts[table] = rows.length;

    await insert('backups', {
      id,
      filename,
      size_bytes: sizeBytes,
      table_counts: json(tableCounts),
      note,
      created_by: req.user!.name,
    });

    await logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      action: 'BACKUP_CREATED',
      entityType: 'BACKUP',
      entityId: id,
      entityLabel: filename,
      meta: { size_bytes: sizeBytes, tables: BACKUP_TABLES.length },
    });

    ok(res, { id, filename, size_bytes: sizeBytes, table_counts: tableCounts }, 201);
  }),
);

adminSystemRoutes.get(
  '/backups/:id/download',
  requirePermission('settings:write'),
  route(async (req, res) => {
    const row = await one<{ id: string; filename: string }>('SELECT id, filename FROM backups WHERE id = $1', [req.params.id]);
    if (!row) throw notFound('Backup not found.');
    const filePath = backupFilePath(row.filename);
    if (!fs.existsSync(filePath)) throw notFound('The backup file is no longer on disk.');
    res.download(filePath, row.filename);
  }),
);

adminSystemRoutes.delete(
  '/backups/:id',
  requirePermission('settings:write'),
  route(async (req, res) => {
    const row = await one<{ id: string; filename: string }>('SELECT id, filename FROM backups WHERE id = $1', [req.params.id]);
    if (!row) throw notFound('Backup not found.');
    const filePath = backupFilePath(row.filename);
    if (fs.existsSync(filePath)) fs.rmSync(filePath);
    await run('DELETE FROM backups WHERE id = $1', [row.id]);

    await logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      action: 'BACKUP_DELETED',
      entityType: 'BACKUP',
      entityId: row.id,
      entityLabel: row.filename,
    });

    ok(res, { deleted: true });
  }),
);
