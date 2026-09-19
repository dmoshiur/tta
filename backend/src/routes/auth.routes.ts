import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.ts';
import { all, insert, one, run } from '../db/index.ts';
import { ApiError, conflict, forbidden, notFound, unauthorized } from '../lib/errors.ts';
import { ok, parse, route } from '../lib/http.ts';
import { hashPassword, passwordIssues, signToken, verifyPassword, createResetToken, hashResetToken } from '../security/tokens.ts';
import { invalidateUserCache } from '../security/session.ts';
import { authenticate } from '../middleware/auth.ts';
import { newId } from '../lib/util.ts';
import { sendMail, passwordResetEmail } from '../lib/messaging.ts';
import { logActivity, notify } from '../services/notifications.ts';

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes and try again.' } },
});

const credentials = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.').max(128),
});

const registerSchema = credentials.extend({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
});

async function userRoleId(): Promise<string> {
  const role = await one<{ id: string }>("SELECT id FROM roles WHERE name = 'USER'");
  if (!role) throw new ApiError(500, 'CONFIGURATION_ERROR', 'The platform roles have not been seeded.');
  return role.id;
}

export function publicUser(row: Record<string, any>) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url ?? null,
    headline: row.headline ?? '',
    bio: row.bio ?? '',
    role: row.role_name ?? 'USER',
    role_label: row.role_label ?? 'Learner',
    is_active: row.is_active !== false,
    created_at: row.created_at,
  };
}

async function loadUserRow(userId: string) {
  return one<Record<string, any>>(
    `SELECT u.*, r.name AS role_name, r.label AS role_label
       FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1`,
    [userId],
  );
}

export const authRoutes = Router();

authRoutes.post(
  '/register',
  authLimiter,
  route(async (req, res) => {
    const data = parse(registerSchema, req.body);
    const issues = passwordIssues(data.password);
    if (issues.length) throw new ApiError(400, 'WEAK_PASSWORD', issues.join(' '), { password: issues });

    const existing = await one<{ id: string }>('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing) throw conflict('An account with this email already exists.', 'EMAIL_EXISTS');

    const id = newId();
    await insert('users', {
      id,
      email: data.email,
      password_hash: await hashPassword(data.password),
      name: data.name,
      role_id: await userRoleId(),
      is_active: true,
    });

    const row = await loadUserRow(id);
    const user = publicUser(row!);
    await notify({ userId: id, title: 'Welcome to ThinkTank Academia', message: 'Learn • Think • Understand • Unite. Your learner account is ready.', type: 'SYSTEM', link: '/dashboard' });
    await logActivity({ actorId: id, actorName: data.name, action: 'REGISTERED', entityType: 'USER', entityId: id, entityLabel: data.email });

    ok(res, { token: signToken({ sub: id, email: user.email, role: user.role }), user }, 201);
  }),
);

authRoutes.post(
  '/login',
  authLimiter,
  route(async (req, res) => {
    const data = parse(credentials, req.body);
    const row = await one<Record<string, any>>(
      `SELECT u.*, r.name AS role_name, r.label AS role_label
         FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.email = $1`,
      [data.email],
    );
    if (!row || !(await verifyPassword(data.password, row.password_hash))) {
      throw unauthorized('Email or password is incorrect.');
    }
    if (!row.is_active) throw forbidden('This account has been suspended. Contact the administrator.');

    await run('UPDATE users SET last_login_at = NOW() WHERE id = $1', [row.id]);
    invalidateUserCache(row.id);
    const user = publicUser(row);
    await logActivity({ actorId: row.id, actorName: row.name, action: 'LOGGED_IN', entityType: 'USER', entityId: row.id, entityLabel: row.email });

    ok(res, { token: signToken({ sub: row.id, email: row.email, role: user.role }), user });
  }),
);

authRoutes.post(
  '/logout',
  authenticate,
  route(async (req, res) => {
    await logActivity({ actorId: req.user!.id, actorName: req.user!.name, action: 'LOGGED_OUT', entityType: 'USER', entityId: req.user!.id });
    ok(res, { loggedOut: true });
  }),
);

/** Returns the current session user — used by the web client on boot and by Android after a cold start. */
authRoutes.get(
  '/session',
  authenticate,
  route(async (req, res) => {
    const row = await loadUserRow(req.user!.id);
    if (!row) throw notFound('Account not found.');
    ok(res, { user: publicUser(row), permissions: req.user!.permissions });
  }),
);

authRoutes.post(
  '/forgot-password',
  authLimiter,
  route(async (req, res) => {
    const data = parse(z.object({ email: z.string().trim().toLowerCase().email() }), req.body);
    const user = await one<Record<string, any>>('SELECT id, name, email FROM users WHERE email = $1', [data.email]);
    const acknowledgement = 'If that address has an account, a password reset link is on its way.';

    if (!user) return ok(res, { message: acknowledgement, delivered: false });

    const { token, hash, expiresAt } = createResetToken();
    await run('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
    await insert('password_resets', { id: newId(), user_id: user.id, token_hash: hash, expires_at: expiresAt });

    const link = `${config.publicUrl || ''}/reset-password?token=${token}`;
    const email = passwordResetEmail(user.name, link);
    const result = await sendMail(user.email, email.subject, email.html);
    await logActivity({ actorId: user.id, actorName: user.name, action: 'PASSWORD_RESET_REQUESTED', entityType: 'USER', entityId: user.id });

    // Development convenience only: without SMTP the link is returned so the flow stays testable.
    ok(res, {
      message: acknowledgement,
      delivered: result.delivered,
      ...(result.delivered || config.isProduction ? {} : { devLink: link }),
    });
  }),
);

authRoutes.get(
  '/reset-password/:token',
  route(async (req, res) => {
    const record = await one<Record<string, any>>(
      `SELECT pr.*, u.email FROM password_resets pr JOIN users u ON u.id = pr.user_id WHERE pr.token_hash = $1`,
      [hashResetToken(String(req.params.token))],
    );
    if (!record || record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
      throw new ApiError(400, 'INVALID_TOKEN', 'This reset link is invalid or has expired. Request a new one.');
    }
    ok(res, { valid: true, email: record.email });
  }),
);

authRoutes.post(
  '/reset-password',
  authLimiter,
  route(async (req, res) => {
    const data = parse(
      z.object({ token: z.string().min(10), password: z.string().min(8).max(128) }),
      req.body,
    );
    const issues = passwordIssues(data.password);
    if (issues.length) throw new ApiError(400, 'WEAK_PASSWORD', issues.join(' '), { password: issues });

    const record = await one<Record<string, any>>('SELECT * FROM password_resets WHERE token_hash = $1', [hashResetToken(data.token)]);
    if (!record || record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
      throw new ApiError(400, 'INVALID_TOKEN', 'This reset link is invalid or has expired. Request a new one.');
    }

    await run('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [await hashPassword(data.password), record.user_id]);
    await run('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [record.id]);
    await notify({ userId: record.user_id, title: 'Password changed', message: 'Your password was reset successfully.', type: 'SYSTEM' });
    await logActivity({ actorId: record.user_id, action: 'PASSWORD_RESET', entityType: 'USER', entityId: record.user_id });

    ok(res, { reset: true });
  }),
);

/** Lists every role with its permissions — used by registration and admin screens. */
authRoutes.get(
  '/roles',
  route(async (_req, res) => {
    const roles = await all<Record<string, any>>('SELECT id, name, label, description, level FROM roles ORDER BY level DESC');
    ok(res, roles);
  }),
);
