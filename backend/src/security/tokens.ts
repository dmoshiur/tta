import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.ts';
import { logger } from '../lib/logger.ts';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

const BCRYPT_ROUNDS = config.isTest ? 4 : 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload & TokenPayload;
    if (!decoded || typeof decoded.sub !== 'string') return null;
    return { sub: decoded.sub, email: decoded.email ?? '', role: decoded.role ?? 'USER' };
  } catch (error) {
    logger.debug('token verification failed', { reason: (error as Error).message });
    return null;
  }
}

/** Extracts a bearer token from the Authorization header (accepts either the Request object or req.headers). */
export function bearerFrom(reqOrHeaders: any): string | null {
  const headers = reqOrHeaders?.headers ?? reqOrHeaders;
  const header = headers?.authorization ?? headers?.Authorization;
  if (typeof header !== 'string') return null;
  const [scheme, value] = header.split(' ');
  if (!value || scheme?.toLowerCase() !== 'bearer') return null;
  return value.trim();
}

export function createResetToken(): { token: string; hash: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + config.jwt.resetTokenTtlMinutes * 60_000).toISOString();
  return { token, hash, expiresAt };
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Basic strength check used by registration, password change and reset. */
export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('Use at least 8 characters.');
  if (password.length > 128) issues.push('Use at most 128 characters.');
  if (!/[A-Za-z]/.test(password)) issues.push('Include at least one letter.');
  if (!/[0-9]/.test(password)) issues.push('Include at least one number.');
  return issues;
}
