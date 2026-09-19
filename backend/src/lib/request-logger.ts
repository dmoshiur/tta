import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db, run } from '../db/index.ts';
import { logger } from './logger.ts';

/**
 * Traffic monitoring — records one row per HTTP request into `request_log`
 * so the /hackeradmin panel can show live traffic, visitors and top pages.
 *
 * The insert happens on `res` finish (after the response is sent) and is
 * fire-and-forget: a database hiccup can never slow down or break a request.
 * Static uploads and health probes are excluded to keep the signal clean.
 */

const IGNORED = /^(\/api\/health|\/api\/v1\/health|\/uploads\/|\/favicon\.ico|\/sw\.js|\/manifest\.webmanifest)/;

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (IGNORED.test(req.path)) {
    next();
    return;
  }
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    try {
      const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
      const row = {
        id: crypto.randomUUID(),
        method: req.method,
        path: req.path.slice(0, 300),
        status: res.statusCode,
        ip: String(req.ip ?? '').slice(0, 64),
        user_agent: String(req.get('user-agent') ?? '').slice(0, 300),
        referrer: String(req.get('referer') ?? '').slice(0, 300),
        duration_ms: durationMs,
        is_api: req.path.startsWith('/api/') ? 1 : 0,
        user_id: (req.user as any)?.id ?? null,
      };
      run(
        `INSERT INTO request_log(id, method, path, status, ip, user_agent, referrer, duration_ms, is_api, user_id)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          row.id,
          row.method,
          row.path,
          row.status,
          row.ip,
          row.user_agent,
          row.referrer,
          row.duration_ms,
          row.is_api,
          row.user_id,
        ],
      ).catch((error) => logger.warn('request log insert failed', { message: (error as Error).message }));
    } catch {
      /* never break the response for observability */
    }
  });
  next();
}

/**
 * Retention: keep seven days of traffic and at most 50,000 rows. Runs on an
 * interval from the server lifecycle; each call is cheap when the table is
 * small enough to keep.
 */
export async function pruneRequestLog(): Promise<void> {
  try {
    await db().execute(
      `DELETE FROM request_log WHERE created_at < (strftime('%Y-%m-%dT%H:%M:%fZ','now','-7 days'))`,
    );
    await db().execute(
      `DELETE FROM request_log WHERE id IN (
         SELECT id FROM request_log ORDER BY created_at ASC LIMIT 50000 OFFSET 50000
       )`,
    );
  } catch (error) {
    logger.warn('request log prune failed', { message: (error as Error).message });
  }
}
