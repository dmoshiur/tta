import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.ts';
import { all, insert, one, run } from '../db/index.ts';
import { ApiError, badRequest, notFound } from '../lib/errors.ts';
import { ok, parse, route } from '../lib/http.ts';
import { json, newId } from '../lib/util.ts';
import { fromJson } from '../lib/util.ts';
import { sanitizePlainText } from '../lib/sanitize.ts';
import { authenticate } from '../middleware/auth.ts';
import { hashPassword, passwordIssues, verifyPassword } from '../security/tokens.ts';
import { invalidateUserCache } from '../security/session.ts';
import { storeUpload, multerFileFilter } from '../lib/storage.ts';
import { publicUser } from './auth.routes.ts';
import { notify } from '../services/notifications.ts';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.storage.maxBytes, files: 1 },
  fileFilter: multerFileFilter as never,
});

export const userRoutes = Router();
userRoutes.use(authenticate);

async function currentUserRow(userId: string) {
  const row = await one<Record<string, any>>(
    `SELECT u.*, r.name AS role_name, r.label AS role_label
       FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1`,
    [userId],
  );
  if (!row) throw notFound('Account not found.');
  return row;
}

userRoutes.get(
  '/me',
  route(async (req, res) => {
    const row = await currentUserRow(req.user!.id);
    ok(res, { ...publicUser(row), preferences: fromJson(row.preferences, {}) });
  }),
);

userRoutes.patch(
  '/me',
  route(async (req, res) => {
    const data = parse(
      z.object({
        name: z.string().trim().min(2).max(80).optional(),
        headline: z.string().trim().max(120).optional(),
        bio: z.string().trim().max(1000).optional(),
        avatar_url: z.string().trim().max(500).nullable().optional(),
        preferences: z
          .object({
            emailNotifications: z.boolean().optional(),
            pushNotifications: z.boolean().optional(),
            quizReminders: z.boolean().optional(),
            publicProfile: z.boolean().optional(),
          })
          .optional(),
      }),
      req.body,
    );

    const row = await currentUserRow(req.user!.id);
    const currentPreferences = fromJson<Record<string, unknown>>(row.preferences, {});
    const updated = await run(
      `UPDATE users
          SET name = $1, headline = $2, bio = $3, avatar_url = $4, preferences = $5, updated_at = NOW()
        WHERE id = $6`,
      [
        data.name !== undefined ? sanitizePlainText(data.name) : row.name,
        data.headline !== undefined ? sanitizePlainText(data.headline) : row.headline,
        data.bio !== undefined ? sanitizePlainText(data.bio) : row.bio,
        data.avatar_url !== undefined ? data.avatar_url : row.avatar_url,
        json({ ...currentPreferences, ...(data.preferences ?? {}) }),
        req.user!.id,
      ],
    );
    if (!updated) throw notFound('Account not found.');

    invalidateUserCache(req.user!.id);
    const fresh = await currentUserRow(req.user!.id);
    ok(res, { ...publicUser(fresh), preferences: fromJson(fresh.preferences, {}) });
  }),
);

userRoutes.patch(
  '/me/password',
  route(async (req, res) => {
    const data = parse(
      z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) }),
      req.body,
    );
    const issues = passwordIssues(data.newPassword);
    if (issues.length) throw new ApiError(400, 'WEAK_PASSWORD', issues.join(' '), { newPassword: issues });

    const row = await one<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [req.user!.id]);
    if (!row) throw notFound('Account not found.');
    if (!(await verifyPassword(data.currentPassword, row.password_hash))) {
      throw badRequest('Your current password is incorrect.');
    }

    await run('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [await hashPassword(data.newPassword), req.user!.id]);
    await notify({ userId: req.user!.id, title: 'Password changed', message: 'Your account password was updated.', type: 'SYSTEM' });
    ok(res, { changed: true });
  }),
);

/** Real file upload → configured storage driver (local disk in development, S3-compatible in production). */
userRoutes.post(
  '/me/avatar',
  upload.single('file'),
  route(async (req, res) => {
    const file = req.file;
    if (!file) throw badRequest('Attach an image file using the "file" field.');
    if (!file.mimetype.startsWith('image/')) throw badRequest('Avatars must be image files.');

    const stored = await storeUpload('avatars', {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    await run('INSERT INTO media(id, url, storage_key, original_name, mime, bytes, alt, folder, uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
      newId(),
      stored.url,
      stored.key,
      stored.originalName,
      stored.mime,
      stored.bytes,
      'Profile picture',
      'avatars',
      req.user!.id,
    ]);
    await run('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [stored.url, req.user!.id]);
    invalidateUserCache(req.user!.id);

    ok(res, { url: stored.url, key: stored.key }, 201);
  }),
);

userRoutes.delete(
  '/me/avatar',
  route(async (req, res) => {
    await run('UPDATE users SET avatar_url = NULL, updated_at = NOW() WHERE id = $1', [req.user!.id]);
    invalidateUserCache(req.user!.id);
    ok(res, { removed: true });
  }),
);

// ── Push device tokens (Android / web push readiness) ───────────────────────

userRoutes.get(
  '/me/devices',
  route(async (req, res) => {
    const devices = await all<Record<string, any>>(
      'SELECT id, token, platform, created_at FROM user_devices WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id],
    );
    ok(res, devices);
  }),
);

userRoutes.post(
  '/me/devices',
  route(async (req, res) => {
    const data = parse(
      z.object({ token: z.string().min(10).max(4096), platform: z.enum(['android', 'ios', 'web']).default('android') }),
      req.body,
    );
    await run(
      `INSERT INTO user_devices(id, user_id, token, platform) VALUES($1, $2, $3, $4)
       ON CONFLICT (token) DO UPDATE SET user_id = $2, platform = $4`,
      [newId(), req.user!.id, data.token, data.platform],
    );
    ok(res, { registered: true }, 201);
  }),
);

userRoutes.delete(
  '/me/devices/:token',
  route(async (req, res) => {
    await run('DELETE FROM user_devices WHERE user_id = $1 AND token = $2', [req.user!.id, req.params.token]);
    ok(res, { removed: true });
  }),
);

/** Deletes the account and every row that belongs to it (cascades are declared in the schema). */
userRoutes.delete(
  '/me',
  route(async (req, res) => {
    const data = parse(z.object({ password: z.string().min(1) }), req.body);
    const row = await one<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [req.user!.id]);
    if (!row || !(await verifyPassword(data.password, row.password_hash))) throw badRequest('Password confirmation is required.');
    if (req.user!.roleName !== 'USER') throw badRequest('Administrator accounts cannot be self-deleted. Ask another Super Admin.');

    await run('DELETE FROM users WHERE id = $1', [req.user!.id]);
    invalidateUserCache(req.user!.id);
    ok(res, { deleted: true });
  }),
);
