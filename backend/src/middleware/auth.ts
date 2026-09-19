import type { NextFunction, Request, Response } from 'express';
import { bearerFrom, verifyToken } from '../security/tokens.ts';
import { hasPermission, isAdmin, resolveUser, type SessionUser } from '../security/session.ts';
import { forbidden, unauthorized } from '../lib/errors.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/** Rejects the request unless a valid bearer token maps to an active user. */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = bearerFrom(req.headers);
    if (!token) throw unauthorized();
    const payload = verifyToken(token);
    if (!payload) throw unauthorized('Your session has expired. Please sign in again.');
    const user = await resolveUser(payload.sub);
    if (!user) throw unauthorized('This account no longer exists.');
    if (!user.isActive) throw forbidden('This account has been suspended.');
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/** Attaches `req.user` when a valid token is present but never rejects the request. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = bearerFrom(req.headers);
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const user = await resolveUser(payload.sub);
        if (user?.isActive) req.user = user;
      }
    }
  } catch {
    /* anonymous is a valid state */
  }
  next();
}

/** Requires any administrator role. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(unauthorized());
  if (!isAdmin(req.user)) return next(forbidden('Administrator access is required.'));
  next();
}

/**
 * Requires a specific permission. Super Admin bypasses granular checks; every
 * other role must hold the permission through its role in the database, so
 * authorization cannot be bypassed by editing client state.
 */
export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (!hasPermission(req.user, permission)) {
      return next(forbidden(`Your role does not include the "${permission}" permission.`));
    }
    next();
  };
}

/** Admin guard that composes both checks. */
export function adminOnly(permission?: string) {
  return [authenticate, requireAdmin, ...(permission ? [requirePermission(permission)] : [])];
}
