import { all, one } from '../db/index.ts';
import type { Row } from '../db/index.ts';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  roleName: string;
  roleLabel: string;
  roleLevel: number;
  permissions: string[];
  isActive: boolean;
}

interface CacheEntry {
  user: SessionUser | null;
  expiresAt: number;
}

const USER_CACHE = new Map<string, CacheEntry>();
const ROLE_CACHE = new Map<string, { permissions: string[]; expiresAt: number }>();
const TTL = 30_000;

export function invalidateUserCache(userId?: string): void {
  if (userId) USER_CACHE.delete(userId);
  else USER_CACHE.clear();
}

export function invalidateRoleCache(): void {
  ROLE_CACHE.clear();
  USER_CACHE.clear();
}

export async function permissionsForRole(roleName: string): Promise<string[]> {
  const cached = ROLE_CACHE.get(roleName);
  if (cached && cached.expiresAt > Date.now()) return cached.permissions;
  const rows = await all<{ permission_id: string }>(
    `SELECT rp.permission_id
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
      WHERE r.name = $1`,
    [roleName],
  );
  const permissions = rows.map((row) => row.permission_id);
  ROLE_CACHE.set(roleName, { permissions, expiresAt: Date.now() + TTL });
  return permissions;
}

function mapUser(row: Row, permissions: string[]): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url ?? null,
    roleName: row.role_name ?? 'USER',
    roleLabel: row.role_label ?? 'Learner',
    roleLevel: Number(row.role_level ?? 1),
    permissions,
    isActive: row.is_active !== false,
  };
}

/** Loads the full session user (role + permissions) for a user id, with a short cache. */
export async function resolveUser(userId: string): Promise<SessionUser | null> {
  const cached = USER_CACHE.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  const row = await one<Row>(
    `SELECT u.id, u.email, u.name, u.avatar_url, u.is_active, r.name AS role_name, r.label AS role_label, r.level AS role_level
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1`,
    [userId],
  );
  if (!row) {
    USER_CACHE.set(userId, { user: null, expiresAt: Date.now() + TTL });
    return null;
  }
  const user = mapUser(row, await permissionsForRole(row.role_name));
  USER_CACHE.set(userId, { user, expiresAt: Date.now() + TTL });
  return user;
}

export const ADMIN_ROLES = ['SUPER_ADMIN', 'CONTENT_ADMIN', 'MODERATOR', 'ANALYST'];

export function isAdmin(user: SessionUser): boolean {
  return ADMIN_ROLES.includes(user.roleName);
}

export function hasPermission(user: SessionUser, permission?: string): boolean {
  if (!isAdmin(user)) return false;
  if (!permission) return true;
  if (user.roleName === 'SUPER_ADMIN') return true;
  return user.permissions.includes(permission);
}
