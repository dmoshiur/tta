import type { NextFunction, Request, Response } from 'express';
import { one, run } from '../db/index.ts';
import { json, fromJson } from '../lib/util.ts';
import { logger } from './logger.ts';

/**
 * Site on/off switch — the kill toggle of the /hackeradmin panel.
 *
 * Stored in the `settings` table under the key `site_switch` (non-public).
 * Reads go through a short in-memory cache so every request does not hit the
 * database; writes invalidate the cache immediately.
 */

export interface SiteSwitch {
  enabled: boolean;
  note: string;
  updatedBy: string;
  updatedAt: string;
}

const CACHE_TTL_MS = 15_000;
let cache: { at: number; value: SiteSwitch } | null = null;

export function invalidateSiteSwitchCache(): void {
  cache = null;
}

export async function getSiteSwitch(force = false): Promise<SiteSwitch> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const row = await one<{ key: string; value: unknown }>("SELECT key, value FROM settings WHERE key = 'site_switch'");
  const value: SiteSwitch = row
    ? (() => {
        const parsed = fromJson<Record<string, unknown>>(row.value, {});
        return {
          enabled: Boolean(parsed.enabled),
          note: String(parsed.note ?? ''),
          updatedBy: String(parsed.updated_by ?? 'system'),
          updatedAt: String(parsed.updated_at ?? ''),
        };
      })()
    : { enabled: true, note: '', updatedBy: 'system', updatedAt: new Date().toISOString() };
  cache = { at: Date.now(), value };
  return value;
}

export async function setSiteSwitch(enabled: boolean, actor: string, note = ''): Promise<SiteSwitch> {
  const value: SiteSwitch = { enabled, note, updatedBy: actor, updatedAt: new Date().toISOString() };
  await run(
    `INSERT INTO settings(key, value, is_public, updated_at) VALUES('site_switch', $1, 0, $2)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = $2`,
    [json(value), value.updatedAt],
  );
  invalidateSiteSwitchCache();
  logger.warn(`site switch: ${enabled ? 'ONLINE' : 'OFFLINE'} by ${actor}${note ? ` — ${note}` : ''}`);
  return value;
}

/** Paths that stay reachable even while the site is switched off. */
const ALWAYS_ALLOWED = /^\/(api\/health|api\/v1\/health|api\/v1\/hackeradmin(\/|$)|hackeradmin(\/|$)|favicon\.ico)$|^\/uploads\//;

const OFFLINE_PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="robots" content="noindex"/>
  <title>ThinkTank Academia — temporarily offline</title>
</head>
<body style="font-family:Georgia,serif;background:#071b33;color:#f7f2e8;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;">
  <div style="text-align:center;max-width:520px;">
    <p style="letter-spacing:0.25em;color:#d4b274;font-size:0.8rem;font-weight:600;margin:0 0 1rem">THINKTANK ACADEMIA</p>
    <h1 style="font-size:2.2rem;margin:0 0 1rem;color:#f7f2e8">The site is temporarily offline</h1>
    <p style="line-height:1.7;color:#c9d4e0">The platform has been switched off for maintenance or safety. Please check back soon — all your data is safe.</p>
    <p style="margin-top:2rem;font-size:0.85rem;color:#7e8ea1">ThinkTank Academia — Learn • Think • Understand • Unite</p>
  </div>
</body>
</html>`;

/**
 * Express middleware: while the switch is OFF every API call returns 503 and
 * every page request receives the offline screen. Health checks, uploads and
 * the /hackeradmin console itself are exempt so operations never lock
 * themselves out.
 */
export async function siteGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.method === 'OPTIONS' || ALWAYS_ALLOWED.test(req.path)) return next();
    const switchState = await getSiteSwitch();
    if (switchState.enabled) return next();

    if (req.path.startsWith('/api/')) {
      res.status(503).json({
        success: false,
        error: { code: 'SITE_OFFLINE', message: 'The site is temporarily offline. Please try again later.' },
      });
      return;
    }
    res.status(503).type('html').send(OFFLINE_PAGE);
  } catch (error) {
    // A transient database failure must not take the site down: fail open.
    logger.warn('siteGuard: could not read the site switch — allowing traffic', { message: (error as Error).message });
    next();
  }
}
