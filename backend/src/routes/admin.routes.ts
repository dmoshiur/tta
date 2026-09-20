import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.ts';
import { all, count, insert, one, run, withTransaction } from '../db/index.ts';
import { ApiError, badRequest, conflict, forbidden, notFound } from '../lib/errors.ts';
import { like, ok, pagination, paged, parse, route } from '../lib/http.ts';
import { fromJson, json, newId } from '../lib/util.ts';
import { sanitizePlainText } from '../lib/sanitize.ts';
import { adminOnly, requirePermission } from '../middleware/auth.ts';
import { getResource, resources, syncQuizTotals, publishScheduled, assertUniqueSlug } from '../admin/registry.ts';
import { storeUpload, multerFileFilter } from '../lib/storage.ts';
import { invalidateRoleCache, invalidateUserCache } from '../security/session.ts';
import { hashPassword } from '../security/tokens.ts';
import { broadcast, logActivity, notify } from '../services/notifications.ts';
import { adminSystemRoutes } from './admin-system.routes.ts';

const param = (p: unknown): string => (Array.isArray(p) ? String(p[0] ?? '') : String(p ?? ''));

export const adminRoutes = Router();

// Every admin route requires authentication and an administrative role.
adminRoutes.use(adminOnly());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.storage.maxBytes, files: 1 },
  fileFilter: multerFileFilter as never,
});

// ── Overview & Statistics ───────────────────────────────────────────────────

adminRoutes.get(
  '/overview',
  route(async (_req, res) => {
    // Collect counts individually — avoids subquery quirks across PostgreSQL variants.
    const [
      users,
      courses,
      publishedCourses,
      modules,
      lessons,
      quizzes,
      questions,
      content,
      books,
      categories,
      enrollments,
      completedEnrollments,
      attempts,
      contacts,
      subscribers,
    ] = await Promise.all([
      count('users'),
      count('courses'),
      count('courses', "status = 'PUBLISHED'"),
      count('modules'),
      count('lessons'),
      count('quizzes'),
      count('questions'),
      count('content'),
      count('books'),
      count('categories'),
      count('enrollments'),
      count('enrollments', "status = 'COMPLETED'"),
      count('attempts', "status = 'SUBMITTED'"),
      count('contacts', "status = 'NEW'"),
      count('subscribers', "status = 'SUBSCRIBED'"),
    ]);

    const recentActivity = await all<Record<string, any>>(
      'SELECT id, actor_name, action, entity_type, entity_label, created_at FROM activity_log ORDER BY created_at DESC LIMIT 12',
    );
    const recentEnrollments = await all<Record<string, any>>(
      `SELECT en.enrolled_at, u.name AS user_name, u.email AS user_email, c.title AS course_title, c.slug AS course_slug
         FROM enrollments en
         JOIN users u ON u.id = en.user_id
         JOIN courses c ON c.id = en.course_id
        ORDER BY en.enrolled_at DESC LIMIT 8`,
    );
    const recentAttempts = await all<Record<string, any>>(
      `SELECT a.id, a.score, a.total, a.percentage, a.passed, a.submitted_at, u.name AS learner, q.title AS quiz_title
         FROM attempts a
         JOIN users u ON u.id = a.user_id
         JOIN quizzes q ON q.id = a.quiz_id
        WHERE a.status = 'SUBMITTED'
        ORDER BY a.submitted_at DESC LIMIT 8`,
    );

    ok(res, {
      stats: {
        users,
        courses,
        published_courses: publishedCourses,
        modules,
        lessons,
        quizzes,
        questions,
        content,
        books,
        categories,
        enrollments,
        completed_enrollments: completedEnrollments,
        attempts,
        pending_messages: contacts,
        subscribers,
      },
      recent_activity: recentActivity,
      recent_enrollments: recentEnrollments,
      recent_attempts: recentAttempts,
    });
  }),
);

// ── Resource Metadata (for dynamic UI rendering) ────────────────────────────

adminRoutes.get(
  '/resources',
  route(async (_req, res) => {
    ok(
      res,
      resources.map((r) => ({
        key: r.key,
        label: r.label,
        singular: r.singular,
        group: r.group,
        fields: r.fields,
        filters: r.filters,
        permissions: r.permissions,
        parent: r.parent,
      })),
    );
  }),
);

// ── Dynamic Options Lookup ──────────────────────────────────────────────────

adminRoutes.get(
  '/options/:resource',
  route(async (req, res) => {
    const key = req.params.resource;
    let rows: { id: string; label: string }[] = [];

    if (key === 'categories') {
      rows = await all<{ id: string; label: string }>('SELECT id, name AS label FROM categories ORDER BY name');
    } else if (key === 'courses') {
      rows = await all<{ id: string; label: string }>('SELECT id, title AS label FROM courses ORDER BY title');
    } else if (key === 'modules') {
      const courseId = req.query.courseId ? String(req.query.courseId) : null;
      rows = await all<{ id: string; label: string }>(
        `SELECT m.id, CONCAT(c.title, ' — ', m.title) AS label FROM modules m JOIN courses c ON c.id = m.course_id ${courseId ? 'WHERE m.course_id = $1' : ''} ORDER BY c.title, m.position`,
        courseId ? [courseId] : [],
      );
    } else if (key === 'quizzes') {
      rows = await all<{ id: string; label: string }>('SELECT id, title AS label FROM quizzes ORDER BY title');
    } else if (key === 'users') {
      rows = await all<{ id: string; label: string }>('SELECT id, CONCAT(name, \' (\', email, \')\') AS label FROM users ORDER BY name');
    } else if (key === 'roles') {
      rows = await all<{ id: string; label: string }>('SELECT id, label FROM roles ORDER BY level DESC');
    }

    ok(res, rows);
  }),
);

// ── Generic Resource CRUD ───────────────────────────────────────────────────

adminRoutes.get(
  '/r/:resource',
  route(async (req, res) => {
    const r = getResource(param(req.params.resource));
    const page = pagination(req.query as Record<string, unknown>, 15, 100);
    const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const where: string[] = [];
    const params: unknown[] = [];

    if (term && r.searchColumns.length) {
      params.push(like(term));
      const clauses = r.searchColumns.map((col) => `${col} ILIKE $${params.length}`);
      where.push(`(${clauses.join(' OR ')})`);
    }

    for (const filter of r.filters) {
      const val = req.query[filter.key];
      if (val !== undefined && val !== '') {
        params.push(val === 'true' ? true : val === 'false' ? false : val);
        where.push(`${filter.key} = $${params.length}`);
      }
    }

    // Filter/order clauses reference main-table columns unqualified; wrapping
    // the (possibly join-heavy) registry select in a derived table keeps every
    // reference unambiguous on SQLite/Turso.
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const totalRow = await one<{ total: number }>(`SELECT COUNT(*)::int AS total FROM ${r.table} ${whereSql}`, params);

    const rows = await all<Record<string, any>>(
      `SELECT base.* FROM (${r.select}) AS base ${whereSql} ORDER BY ${r.orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, page.limit, page.offset],
    );

    ok(res, paged(rows.map(r.fromRow), page, Number(totalRow?.total ?? 0)));
  }),
);

adminRoutes.get(
  '/r/:resource/:id',
  route(async (req, res) => {
    const r = getResource(param(req.params.resource));
    const row = await one<Record<string, any>>(`SELECT * FROM (${r.select}) AS base WHERE base.id = $1`, [param(req.params.id)]);
    if (!row) throw notFound(`${r.singular} not found.`);
    ok(res, r.fromRow(row));
  }),
);

adminRoutes.post(
  '/r/:resource',
  route(async (req, res) => {
    const r = getResource(param(req.params.resource));
    if (!req.user || (req.user.roleName !== 'SUPER_ADMIN' && !req.user.permissions.includes(r.permissions.write))) {
      throw forbidden(`Permission "${r.permissions.write}" required.`);
    }

    const data = parse(r.schema, req.body) as Record<string, any>;
    const id = newId();

    if ('slug' in data && data.slug) {
      await assertUniqueSlug(r.table, data.slug);
    } else if (r.fields.some((f) => f.key === 'slug')) {
      const generated = data.title ? data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80) : id.slice(0, 8);
      data.slug = `${generated}-${newId().slice(0, 4)}`;
    }

    const columns: Record<string, any> = { id, ...r.toColumns(data) };
    if ('slug' in data) columns.slug = data.slug;

    await insert(r.table, columns);
    const saved = await one<Record<string, any>>(`SELECT * FROM (${r.select}) AS base WHERE base.id = $1`, [id]);

    if (r.afterSave) await r.afterSave(saved!, 'create', { id: req.user.id, name: req.user.name });
    await logActivity({
      actorId: req.user.id,
      actorName: req.user.name,
      action: `${r.singular.toUpperCase()}_CREATED`,
      entityType: r.singular.toUpperCase(),
      entityId: id,
      entityLabel: String(saved?.title || saved?.name || id),
    });

    ok(res, r.fromRow(saved!), 201);
  }),
);

adminRoutes.patch(
  '/r/:resource/:id',
  route(async (req, res) => {
    const r = getResource(param(req.params.resource));
    if (!req.user || (req.user.roleName !== 'SUPER_ADMIN' && !req.user.permissions.includes(r.permissions.write))) {
      throw forbidden(`Permission "${r.permissions.write}" required.`);
    }

    const targetId = param(req.params.id);
    const existing = await one<Record<string, any>>(`SELECT * FROM ${r.table} WHERE id = $1`, [targetId]);
    if (!existing) throw notFound(`${r.singular} not found.`);

    const schema = (r.schema instanceof z.ZodObject ? r.schema.partial() : z.record(z.string(), z.any())) as z.ZodType<any>;
    const data = parse(schema, req.body) as Record<string, any>;
    if (data.slug && data.slug !== existing.slug) {
      await assertUniqueSlug(r.table, data.slug, targetId);
    }

    const updates = r.toColumns({ ...existing, ...data }, existing);
    if (data.slug) updates.slug = data.slug;

    // Build UPDATE query
    const pairs = Object.entries(updates);
    const setClause = pairs.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const params = [...pairs.map(([, v]) => v), targetId];

    await run(`UPDATE ${r.table} SET ${setClause} WHERE id = $${params.length}`, params);
    const updated = await one<Record<string, any>>(`SELECT * FROM (${r.select}) AS base WHERE base.id = $1`, [targetId]);

    if (r.afterSave) await r.afterSave(updated!, 'update', { id: req.user.id, name: req.user.name });
    await logActivity({
      actorId: req.user.id,
      actorName: req.user.name,
      action: `${r.singular.toUpperCase()}_UPDATED`,
      entityType: r.singular.toUpperCase(),
      entityId: targetId,
      entityLabel: String(updated?.title || updated?.name || targetId),
    });

    ok(res, r.fromRow(updated!));
  }),
);

adminRoutes.delete(
  '/r/:resource/:id',
  route(async (req, res) => {
    const r = getResource(param(req.params.resource));
    if (!req.user || (req.user.roleName !== 'SUPER_ADMIN' && !req.user.permissions.includes(r.permissions.delete))) {
      throw forbidden(`Permission "${r.permissions.delete}" required.`);
    }

    const targetId = param(req.params.id);
    const existing = await one<Record<string, any>>(`SELECT * FROM ${r.table} WHERE id = $1`, [targetId]);
    if (!existing) throw notFound(`${r.singular} not found.`);

    await run(`DELETE FROM ${r.table} WHERE id = $1`, [targetId]);

    await logActivity({
      actorId: req.user.id,
      actorName: req.user.name,
      action: `${r.singular.toUpperCase()}_DELETED`,
      entityType: r.singular.toUpperCase(),
      entityId: targetId,
      entityLabel: String(existing?.title || existing?.name || targetId),
    });

    ok(res, { deleted: true });
  }),
);

// Toggle publish state shortcut
adminRoutes.post(
  '/r/:resource/:id/publish',
  route(async (req, res) => {
    const r = getResource(param(req.params.resource));
    const targetId = param(req.params.id);
    const row = await one<Record<string, any>>(`SELECT * FROM ${r.table} WHERE id = $1`, [targetId]);
    if (!row) throw notFound(`${r.singular} not found.`);

    const newStatus = row.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    await run(`UPDATE ${r.table} SET status = $1, updated_at = NOW() ${newStatus === 'PUBLISHED' ? ', published_at = NOW()' : ''} WHERE id = $2`, [
      newStatus,
      targetId,
    ]);

    await logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      action: `${r.singular.toUpperCase()}_${newStatus}`,
      entityType: r.singular.toUpperCase(),
      entityId: targetId,
      entityLabel: String(row.title || row.name || targetId),
    });

    ok(res, { status: newStatus });
  }),
);

// ── User Management ─────────────────────────────────────────────────────────

adminRoutes.get(
  '/users',
  requirePermission('users:read'),
  route(async (req, res) => {
    const page = pagination(req.query as Record<string, unknown>, 20, 100);
    const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const roleId = typeof req.query.role_id === 'string' && req.query.role_id ? req.query.role_id : null;

    const where: string[] = [];
    const params: unknown[] = [];
    if (term) {
      params.push(like(term));
      where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    if (roleId) {
      params.push(roleId);
      where.push(`u.role_id = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = await one<{ total: number }>(`SELECT COUNT(*)::int AS total FROM users u ${whereSql}`, params);
    const rows = await all<Record<string, any>>(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.headline, u.is_active, u.created_at, u.last_login_at,
              r.id AS role_id, r.name AS role_name, r.label AS role_label, r.level AS role_level
         FROM users u JOIN roles r ON r.id = u.role_id
        ${whereSql}
        ORDER BY u.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, page.limit, page.offset],
    );

    ok(res, paged(rows, page, Number(total?.total ?? 0)));
  }),
);

adminRoutes.post(
  '/users',
  requirePermission('users:write'),
  route(async (req, res) => {
    const data = parse(
      z.object({
        name: z.string().trim().min(2).max(80),
        email: z.string().trim().toLowerCase().email(),
        password: z.string().min(8).max(128),
        role_id: z.string().min(1),
        headline: z.string().trim().max(120).optional(),
        is_active: z.boolean().default(true),
      }),
      req.body,
    );

    const existing = await one<{ id: string }>('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing) throw conflict('Email is already registered.', 'EMAIL_EXISTS');

    const role = await one<{ id: string; name: string; level: number }>('SELECT id, name, level FROM roles WHERE id = $1', [data.role_id]);
    if (!role) throw notFound('Role not found.');

    if (req.user!.roleName !== 'SUPER_ADMIN' && role.level >= req.user!.roleLevel) {
      throw forbidden('You cannot assign a role with equal or higher privilege.');
    }

    const id = newId();
    await insert('users', {
      id,
      name: sanitizePlainText(data.name),
      email: data.email,
      password_hash: await hashPassword(data.password),
      role_id: role.id,
      headline: sanitizePlainText(data.headline ?? ''),
      is_active: data.is_active,
    });

    await logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: id,
      entityLabel: `${data.name} (${data.email})`,
    });

    ok(res, { id, email: data.email, name: data.name, role_name: role.name }, 201);
  }),
);

adminRoutes.patch(
  '/users/:id',
  requirePermission('users:write'),
  route(async (req, res) => {
    const target = await one<Record<string, any>>(
      `SELECT u.*, r.level AS role_level, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
      [req.params.id],
    );
    if (!target) throw notFound('User not found.');

    // Non-super-admins cannot modify super-admins or higher roles
    if (req.user!.roleName !== 'SUPER_ADMIN' && target.role_level >= req.user!.roleLevel) {
      throw forbidden('You cannot modify an account with equal or higher privilege.');
    }

    const data = parse(
      z.object({
        name: z.string().trim().min(2).max(80).optional(),
        role_id: z.string().min(1).optional(),
        headline: z.string().trim().max(120).optional(),
        is_active: z.boolean().optional(),
        password: z.string().min(8).max(128).optional(),
      }),
      req.body,
    );

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updates.name = sanitizePlainText(data.name);
    if (data.headline !== undefined) updates.headline = sanitizePlainText(data.headline);
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    if (data.password) updates.password_hash = await hashPassword(data.password);

    if (data.role_id && data.role_id !== target.role_id) {
      const newRole = await one<{ id: string; level: number }>('SELECT id, level FROM roles WHERE id = $1', [data.role_id]);
      if (!newRole) throw notFound('Role not found.');
      if (req.user!.roleName !== 'SUPER_ADMIN' && newRole.level >= req.user!.roleLevel) {
        throw forbidden('You cannot promote someone to equal or higher privilege.');
      }
      updates.role_id = newRole.id;
    }

    const pairs = Object.entries(updates);
    const setSql = pairs.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    await run(`UPDATE users SET ${setSql} WHERE id = $${pairs.length + 1}`, [...pairs.map(([, v]) => v), target.id]);

    invalidateUserCache(target.id);
    await logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: target.id,
      entityLabel: target.email,
    });

    ok(res, { updated: true });
  }),
);

adminRoutes.delete(
  '/users/:id',
  requirePermission('users:delete'),
  route(async (req, res) => {
    if (req.params.id === req.user!.id) throw badRequest('You cannot delete your own account from the admin panel.');

    const target = await one<Record<string, any>>(
      `SELECT u.*, r.level AS role_level FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
      [req.params.id],
    );
    if (!target) throw notFound('User not found.');

    if (req.user!.roleName !== 'SUPER_ADMIN' && target.role_level >= req.user!.roleLevel) {
      throw forbidden('You cannot delete an account with equal or higher privilege.');
    }

    await run('DELETE FROM users WHERE id = $1', [target.id]);
    invalidateUserCache(target.id);
    await logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      action: 'USER_DELETED',
      entityType: 'USER',
      entityId: target.id,
      entityLabel: target.email,
    });

    ok(res, { deleted: true });
  }),
);

// ── Roles & Permissions ─────────────────────────────────────────────────────

adminRoutes.get(
  '/roles',
  requirePermission('roles:read'),
  route(async (_req, res) => {
    const roles = await all<Record<string, any>>('SELECT * FROM roles ORDER BY level DESC');
    const rolePermissions = await all<{ role_id: string; permission_id: string }>(
      'SELECT role_id, permission_id FROM role_permissions',
    );
    const permissions = await all<Record<string, any>>('SELECT * FROM permissions ORDER BY grp, id');

    const permMap = new Map<string, string[]>();
    for (const rp of rolePermissions) {
      const list = permMap.get(rp.role_id) ?? [];
      list.push(rp.permission_id);
      permMap.set(rp.role_id, list);
    }

    ok(res, {
      roles: roles.map((role) => ({ ...role, permissions: permMap.get(role.id) ?? [] })),
      permissions,
    });
  }),
);

adminRoutes.patch(
  '/roles/:id/permissions',
  requirePermission('roles:write'),
  route(async (req, res) => {
    const role = await one<{ id: string; name: string }>('SELECT id, name FROM roles WHERE id = $1', [req.params.id]);
    if (!role) throw notFound('Role not found.');
    if (role.name === 'SUPER_ADMIN') throw badRequest('Super Admin always holds every permission.');

    const data = parse(z.object({ permissions: z.array(z.string()) }), req.body);

    await run('DELETE FROM role_permissions WHERE role_id = $1', [role.id]);
    for (const permId of data.permissions) {
      await run('INSERT INTO role_permissions(role_id, permission_id) VALUES($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING', [
        role.id,
        permId,
      ]);
    }

    invalidateRoleCache();
    await logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      action: 'ROLE_PERMISSIONS_UPDATED',
      entityType: 'ROLE',
      entityId: role.id,
      entityLabel: role.name,
      meta: { permissions: data.permissions },
    });

    ok(res, { saved: true, permissions: data.permissions });
  }),
);

// ── Site Settings ───────────────────────────────────────────────────────────

adminRoutes.get(
  '/settings',
  requirePermission('settings:write'),
  route(async (_req, res) => {
    const rows = await all<{ key: string; value: unknown; is_public: boolean }>('SELECT key, value, is_public FROM settings');
    const result: Record<string, any> = {};
    for (const row of rows) {
      result[row.key] = fromJson(row.value, {});
    }
    ok(res, result);
  }),
);

adminRoutes.put(
  '/settings/:key',
  requirePermission('settings:write'),
  route(async (req, res) => {
    const key = param(req.params.key);
    const value = req.body;
    const isPublic = !['secrets', 'smtp_internal', 'schema_version'].includes(key);

    await run(
      `INSERT INTO settings(key, value, is_public, updated_at) VALUES($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, is_public = $3, updated_at = NOW()`,
      [key, json(value), isPublic],
    );

    await logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      action: 'SETTINGS_UPDATED',
      entityType: 'SETTINGS',
      entityId: key,
      entityLabel: key,
    });

    ok(res, { saved: true, key });
  }),
);

// ── Media Upload ────────────────────────────────────────────────────────────

adminRoutes.post(
  '/media/upload',
  requirePermission('media:write'),
  upload.single('file'),
  route(async (req, res) => {
    const file = req.file;
    if (!file) throw badRequest('No file uploaded.');

    const folder = String(req.body.folder || 'general');
    const stored = await storeUpload(folder, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    const id = newId();
    await insert('media', {
      id,
      url: stored.url,
      storage_key: stored.key,
      original_name: stored.originalName,
      mime: stored.mime,
      bytes: stored.bytes,
      alt: sanitizePlainText(String(req.body.alt || file.originalname)),
      folder,
      uploaded_by: req.user!.id,
    });

    ok(res, { id, url: stored.url, original_name: stored.originalName, bytes: stored.bytes }, 201);
  }),
);

// ── Announcement Broadcast ──────────────────────────────────────────────────

adminRoutes.post(
  '/broadcast',
  requirePermission('notifications:send'),
  route(async (req, res) => {
    const data = parse(
      z.object({
        title: z.string().trim().min(3).max(160),
        message: z.string().trim().max(1000).optional(),
        type: z.enum(['ANNOUNCEMENT', 'SYSTEM', 'COURSE']).default('ANNOUNCEMENT'),
        link: z.string().trim().max(300).optional(),
      }),
      req.body,
    );

    const id = await broadcast({
      title: sanitizePlainText(data.title),
      message: sanitizePlainText(data.message ?? ''),
      type: data.type,
      link: data.link || '',
    });

    await logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      action: 'BROADCAST_SENT',
      entityType: 'NOTIFICATION',
      entityId: id,
      entityLabel: data.title,
    });

    ok(res, { id, broadcast: true }, 201);
  }),
);

// ── Analytics ───────────────────────────────────────────────────────────────

adminRoutes.get(
  '/analytics',
  requirePermission('analytics:read'),
  route(async (_req, res) => {
    // Fetch raw analytics events (last 1000) and aggregate in memory for maximum
    // portability across real PostgreSQL and in-memory test engines.
    const recentEvents = await all<{ event: string; path: string; created_at: string }>(
      'SELECT event, path, created_at FROM analytics_events ORDER BY created_at DESC LIMIT 1000',
    );

    const dayMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    const pageMap = new Map<string, number>();

    for (const e of recentEvents) {
      const day = e.created_at ? new Date(e.created_at).toISOString().slice(0, 10) : 'unknown';
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
      typeMap.set(e.event, (typeMap.get(e.event) ?? 0) + 1);
      if (e.path) pageMap.set(e.path, (pageMap.get(e.path) ?? 0) + 1);
    }

    const eventsByDay = [...dayMap.entries()].map(([date, count]) => ({ date, count })).slice(0, 30);
    const eventsByType = [...typeMap.entries()].map(([event, count]) => ({ event, count }));
    const topPages = [...pageMap.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const topCoursesRaw = await all<Record<string, any>>(
      `SELECT c.id, c.title, c.slug, c.views FROM courses c WHERE c.status = 'PUBLISHED' ORDER BY c.views DESC LIMIT 10`,
    );
    const enrollmentsCount = await all<{ course_id: string; total: number }>(
      'SELECT course_id, COUNT(*)::int AS total FROM enrollments GROUP BY course_id',
    );
    const enrollMap = new Map(enrollmentsCount.map((r) => [r.course_id, Number(r.total)]));
    const topCourses = topCoursesRaw.map((c) => ({ ...c, enrollments: enrollMap.get(c.id) ?? 0 }));

    const topContent = await all<Record<string, any>>(
      `SELECT id, title, slug, type, views FROM content WHERE status = 'PUBLISHED' ORDER BY views DESC LIMIT 10`,
    );

    ok(res, {
      events_by_day: eventsByDay,
      events_by_type: eventsByType,
      top_pages: topPages,
      top_courses: topCourses,
      top_content: topContent,
    });
  }),
);

// ── Activity Log ────────────────────────────────────────────────────────────

adminRoutes.get(
  '/activity',
  route(async (req, res) => {
    const page = pagination(req.query as Record<string, unknown>, 25, 100);
    const total = await count('activity_log');
    const rows = await all<Record<string, any>>(
      `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [page.limit, page.offset],
    );
    ok(res, paged(rows, page, total));
  }),
);

// ── Trigger Scheduled Content Publisher ─────────────────────────────────────

adminRoutes.post(
  '/publish-scheduled',
  route(async (_req, res) => {
    const published = await publishScheduled();
    ok(res, { published });
  }),
);

// ── Super Admin console: system, e-mail, security, audit & backup APIs ──────
// Mounted last so the specific routes above keep priority; inherits adminOnly().
adminRoutes.use(adminSystemRoutes);
