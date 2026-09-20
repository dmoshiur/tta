import { Router } from 'express';
import { config } from '../config.ts';
import { notFound } from '../lib/errors.ts';
import { ok, route } from '../lib/http.ts';
import { resolveGatewayDownload } from '../lib/storage.ts';

/**
 * Public media redirector for files kept on the Storage Gateway.
 *
 * The gateway keeps every object private and only ever hands out short-lived
 * signed URLs, while the application stores permanent URLs in the database
 * (`media.url`, `users.avatar_url`, course covers, book files …). This router
 * bridges the two: `/api/v1/media/:id[/:filename]` asks the gateway for a fresh
 * signed link and redirects the browser to it.
 *
 * Signed links are cached in memory until shortly before they expire, so a
 * popular download costs one gateway call per hour rather than one per click
 * (the gateway rate-limits `files:download` per caller IP).
 */
export const mediaRoutes = Router();

interface CachedLink {
  url: string;
  expiresAt: number;
  filename: string;
  mimeType: string;
  size: number;
}

const SAFETY_MARGIN_MS = 60_000;
const MAX_CACHE_TTL_MS = 55 * 60_000;
const MAX_CACHE_ENTRIES = 5_000;
const cache = new Map<string, CachedLink>();

function pruneCache(now: number): void {
  for (const [id, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(id);
  }
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  // Still too large — drop the oldest insertions (Map preserves insertion order).
  const overflow = cache.size - MAX_CACHE_ENTRIES;
  let dropped = 0;
  for (const id of cache.keys()) {
    if (dropped >= overflow) break;
    cache.delete(id);
    dropped += 1;
  }
}

/** Test/ops hook — clears cached links (e.g. after credentials rotate). */
export function clearMediaLinkCache(): void {
  cache.clear();
}

async function signedLink(id: string): Promise<CachedLink> {
  const now = Date.now();
  const cached = cache.get(id);
  if (cached && cached.expiresAt - SAFETY_MARGIN_MS > now) return cached;

  const resolved = await resolveGatewayDownload(id);
  const gatewayExpiry = Date.parse(resolved.expiresAt);
  const expiresAt = Math.min(Number.isFinite(gatewayExpiry) ? gatewayExpiry : now + MAX_CACHE_TTL_MS, now + MAX_CACHE_TTL_MS);
  const entry: CachedLink = {
    url: resolved.url,
    expiresAt,
    filename: resolved.filename,
    mimeType: resolved.mimeType,
    size: resolved.size,
  };
  if (expiresAt - SAFETY_MARGIN_MS > now) {
    if (cache.size >= MAX_CACHE_ENTRIES) pruneCache(now);
    cache.set(id, entry);
  }
  return entry;
}

/**
 * Links keep working after a driver switch as long as the gateway credentials
 * are still configured — rows written by the gateway driver reference it forever.
 */
function requireGatewayConfigured(): void {
  const { url, keySecret } = config.storage.gateway;
  if (!url || !keySecret) throw notFound('Media storage gateway is not configured.');
}

const redirect = route(async (req, res) => {
  requireGatewayConfigured();
  const id = String(req.params.id ?? '');
  const link = await signedLink(id);
  res.setHeader('Cache-Control', 'private, no-store');
  res.redirect(302, link.url);
});

/** Metadata (JSON) — lets clients inspect a stored file without downloading it. */
mediaRoutes.get(
  '/:id/meta',
  route(async (req, res) => {
    requireGatewayConfigured();
    const link = await signedLink(String(req.params.id ?? ''));
    ok(res, { id: req.params.id, filename: link.filename, mimeType: link.mimeType, size: link.size, expiresAt: new Date(link.expiresAt).toISOString() });
  }),
);

mediaRoutes.get('/:id', redirect);
// The trailing file name is cosmetic (nicer download names / previews); only :id matters.
mediaRoutes.get('/:id/:filename', redirect);
