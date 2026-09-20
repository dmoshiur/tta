import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.ts';
import { logger } from './logger.ts';
import { ApiError, badRequest, notFound } from './errors.ts';

export interface StoredFile {
  url: string;
  key: string;
  bytes: number;
  mime: string;
  originalName: string;
}

export interface UploadInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
};

const SAFE_FOLDERS = new Set(['avatars', 'courses', 'lessons', 'articles', 'books', 'logos', 'general', 'assignments']);

export function assertUploadAllowed(file: UploadInput): void {
  if (!(config.storage.allowedMimeTypes as readonly string[]).includes(file.mimetype)) {
    throw badRequest(`File type "${file.mimetype || 'unknown'}" is not allowed.`);
  }
  if (file.size > config.storage.maxBytes) {
    throw badRequest(`File is larger than the ${Math.round(config.storage.maxBytes / (1024 * 1024))} MB limit.`);
  }
  if (!file.buffer?.length) throw badRequest('The uploaded file is empty.');
}

function buildKey(folder: string, file: UploadInput): string {
  const safe = SAFE_FOLDERS.has(folder) ? folder : 'general';
  const extension = EXTENSIONS[file.mimetype] ?? path.extname(file.originalname).slice(0, 8) ?? '';
  const stamp = new Date().toISOString().slice(0, 7).replace('-', '');
  return `${safe}/${stamp}/${crypto.randomUUID()}${extension}`;
}

// ── AWS Signature Version 4 (works with S3, Cloudflare R2, DigitalOcean Spaces, Backblaze B2, MinIO) ──

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function encodePath(key: string): string {
  return `/${key.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`;
}

interface SignedRequest {
  url: string;
  headers: Record<string, string>;
}

export function signS3Request(options: {
  method: string;
  host: string;
  basePath: string;
  body: Buffer | string;
  contentType?: string;
  region: string;
  service?: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}): SignedRequest {
  const service = options.service ?? 's3';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(options.body);

  const headers: Record<string, string> = {
    host: options.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (options.contentType) headers['content-type'] = options.contentType;
  if (options.sessionToken) headers['x-amz-security-token'] = options.sessionToken;

  const signedHeaderNames = Object.keys(headers).map((name) => name.toLowerCase()).sort();
  const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${String(headers[name]).trim()}\n`).join('');
  const canonicalRequest = [
    options.method.toUpperCase(),
    options.basePath,
    '',
    canonicalHeaders,
    signedHeaderNames.join(';'),
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${options.region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${options.secretAccessKey}`, dateStamp), options.region), service), 'aws4_request');
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  headers.Authorization = `AWS4-HMAC-SHA256 Credential=${options.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderNames.join(
    ';',
  )}, Signature=${signature}`;

  return { url: `https://${options.host}${options.basePath}`, headers };
}

async function putToS3(key: string, file: UploadInput): Promise<StoredFile> {
  const { storage } = config;
  const endpoint = new URL(storage.endpoint);
  const basePath = encodePath(`${storage.bucket}/${key}`);
  const signed = signS3Request({
    method: 'PUT',
    host: endpoint.host,
    basePath,
    body: file.buffer,
    contentType: file.mimetype,
    region: storage.region,
    accessKeyId: storage.accessKeyId,
    secretAccessKey: storage.secretAccessKey,
  });

  const response = await fetch(signed.url, {
    method: 'PUT',
    headers: { ...signed.headers, 'content-length': String(file.size) },
    body: file.buffer as unknown as BodyInit,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logger.error('storage: object store rejected the upload', { status: response.status, body: body.slice(0, 400) });
    throw badRequest('The media provider rejected the upload. Check STORAGE_* configuration.');
  }

  const publicBase = storage.publicUrl || `${storage.endpoint.replace(/\/+$/, '')}/${storage.bucket}`;
  return {
    url: `${publicBase}/${key}`,
    key,
    bytes: file.size,
    mime: file.mimetype,
    originalName: file.originalname,
  };
}

async function deleteFromS3(key: string): Promise<void> {
  const { storage } = config;
  const endpoint = new URL(storage.endpoint);
  const signed = signS3Request({
    method: 'DELETE',
    host: endpoint.host,
    basePath: encodePath(`${storage.bucket}/${key}`),
    body: '',
    region: storage.region,
    accessKeyId: storage.accessKeyId,
    secretAccessKey: storage.secretAccessKey,
  });
  const response = await fetch(signed.url, { method: 'DELETE', headers: signed.headers });
  if (!response.ok) logger.warn('storage: delete failed', { key, status: response.status });
}

// ── Storage Gateway (NGO File Cloud "Storage Bridge" — the project's own gateway) ──
//
// REST contract (see dmoshiur/storage-gateway → API.md):
//   POST   {url}/files                 multipart: file, title, description, category, tags   → 201 { data: { file, url, expiresAt } }
//   GET    {url}/files/{id}/download                                                        → 200 { data: { url, expiresAt, filename, size, mimeType } }
//   DELETE {url}/files/{id}            moves the document to Trash                          → 200 { data: { file } }
//   GET    {url}/health                unauthenticated liveness probe
// Auth — the gateway issues two credential families and verifies them differently:
//   • bearer keys  (id ng_key_…,        secret ng_live_…) → Authorization: Bearer <secret>
//   • bridge keys  (id am_store_live_…, secret am_sec_live_…) → X-AM-Storage-Key-Id + X-AM-Storage-Key-Secret
// On the upload route the X-AM headers take precedence over a Bearer header, so the
// family is chosen from the key-id prefix and only one form is ever sent.
// Errors: { success:false, error:{ code, message, requestId } }.

interface GatewayEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string; requestId?: string };
  requestId?: string;
}

interface GatewayFile {
  id: string;
  originalName: string;
  title?: string;
  mimeType: string;
  size: number;
  status: string;
}

/** Gateway file ids are opaque URL-safe tokens; the key we persist is `gw:<id>`. */
const GATEWAY_KEY_PREFIX = 'gw:';
const GATEWAY_ID_PATTERN = /^[A-Za-z0-9_-]{8,200}$/;

export function gatewayFileIdFromKey(key: string): string | null {
  if (!key.startsWith(GATEWAY_KEY_PREFIX)) return null;
  const id = key.slice(GATEWAY_KEY_PREFIX.length);
  return GATEWAY_ID_PATTERN.test(id) ? id : null;
}

const BRIDGE_KEY_ID_PREFIX = 'am_store_live_';

/** Which credential family the configured key belongs to (see the auth note above). */
export function gatewayAuthMode(): 'bearer' | 'dual-token' | 'none' {
  const { keyId, keySecret } = config.storage.gateway;
  if (!keySecret) return 'none';
  return keyId.startsWith(BRIDGE_KEY_ID_PREFIX) ? 'dual-token' : 'bearer';
}

function gatewayHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const { gateway } = config.storage;
  const headers: Record<string, string> = { Accept: 'application/json', ...extra };
  if (gatewayAuthMode() === 'dual-token') {
    headers['X-AM-Storage-Key-Id'] = gateway.keyId;
    headers['X-AM-Storage-Key-Secret'] = gateway.keySecret;
  } else if (gateway.keySecret) {
    headers.Authorization = `Bearer ${gateway.keySecret}`;
  }
  return headers;
}

function assertGatewayConfigured(): void {
  const { gateway } = config.storage;
  if (!gateway.url || !gateway.keySecret) {
    throw new ApiError(503, 'STORAGE_NOT_CONFIGURED', 'Media storage is not configured. Set STORAGE_GATEWAY_URL and STORAGE_GATEWAY_KEY_SECRET.');
  }
}

async function gatewayFetch<T>(method: string, route: string, init: { body?: BodyInit; headers?: Record<string, string> } = {}): Promise<{ status: number; body: GatewayEnvelope<T> }> {
  assertGatewayConfigured();
  const url = `${config.storage.gateway.url}${route}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.storage.gateway.timeoutMs);
  try {
    const response = await fetch(url, { method, headers: gatewayHeaders(init.headers), body: init.body, signal: controller.signal });
    const text = await response.text().catch(() => '');
    let body: GatewayEnvelope<T>;
    try {
      body = text ? (JSON.parse(text) as GatewayEnvelope<T>) : { success: response.ok };
    } catch {
      body = { success: false, error: { code: 'BAD_GATEWAY_RESPONSE', message: text.slice(0, 200) } };
    }
    return { status: response.status, body };
  } catch (error) {
    const reason = (error as Error).name === 'AbortError' ? 'timeout' : (error as Error).message;
    logger.error('storage: gateway unreachable', { method, route, reason });
    throw new ApiError(502, 'STORAGE_UNAVAILABLE', 'The media storage gateway could not be reached. Please try again shortly.');
  } finally {
    clearTimeout(timer);
  }
}

/** Maps a gateway error envelope onto the application's error model without leaking internals. */
function gatewayError(status: number, body: GatewayEnvelope<unknown>, action: string): ApiError {
  const code = body.error?.code ?? 'GATEWAY_ERROR';
  const message = body.error?.message ?? '';
  const details = { status, code, message: message.slice(0, 300), requestId: body.error?.requestId ?? body.requestId };
  // Caller mistakes (wrong file type, unknown id) are expected traffic; credential and server failures are not.
  if (status === 400 || status === 404 || status === 413 || status === 422) logger.warn(`storage: gateway rejected ${action}`, details);
  else logger.error(`storage: gateway rejected ${action}`, details);

  if (status === 401 || status === 403) {
    return new ApiError(502, 'STORAGE_AUTH_FAILED', 'The media storage gateway rejected this server\'s credentials. Check STORAGE_GATEWAY_KEY_ID / STORAGE_GATEWAY_KEY_SECRET.');
  }
  if (status === 404) return notFound('The stored file was not found on the media storage gateway.');
  if (status === 413 || code === 'FILE_TOO_LARGE') return badRequest('The file is larger than the storage gateway allows.');
  if (status === 409 && code === 'STORAGE_LIMIT_EXCEEDED') return new ApiError(507, 'STORAGE_FULL', 'The media storage quota is exhausted. Free up space on the storage gateway.');
  if (status === 429) return new ApiError(429, 'RATE_LIMITED', 'The media storage gateway is rate limiting uploads. Please retry in a minute.');
  if (status >= 400 && status < 500) {
    // Validation failures (INVALID_FILE_TYPE, INVALID_DOCUMENT, …) are the caller's problem — pass the reason through.
    return badRequest(message || 'The media storage gateway rejected the upload.', { code });
  }
  return new ApiError(502, 'STORAGE_UNAVAILABLE', 'The media storage gateway failed to process the request. Please try again shortly.');
}

/**
 * Vercel rejects function payloads above ~4.5 MB before the gateway code runs,
 * so larger documents go through the gateway's presigned init → PUT → complete
 * flow (bytes stream straight to its private object store). Same threshold the
 * gateway itself recommends (DIRECT_UPLOAD_GUIDANCE_BYTES).
 */
export const GATEWAY_DIRECT_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

interface GatewayUploadMeta {
  uploadName: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
}

function gatewayUploadMeta(key: string, folder: string, file: UploadInput): GatewayUploadMeta {
  const category = SAFE_FOLDERS.has(folder) ? folder : 'general';
  // The gateway derives the type from the extension AND sniffs the bytes; send the real name.
  const original = path.basename(file.originalname || '').replace(/\0/g, '').trim();
  const uploadName = (original && path.extname(original) ? original : path.basename(key)).slice(0, 180);
  return {
    uploadName,
    title: path.basename(uploadName, path.extname(uploadName)).slice(0, 160) || 'Untitled',
    category,
    description: `${config.site.name} upload — folder "${category}"`,
    tags: ['thinktank-academia', category],
  };
}

function requireGatewayFile(status: number, body: GatewayEnvelope<{ file?: GatewayFile }>, action: string): GatewayFile {
  if (!body.success || !body.data?.file?.id) {
    if (status >= 400 || !body.success) throw gatewayError(status, body, action);
    logger.error('storage: gateway returned no file id', { status, action });
    throw new ApiError(502, 'STORAGE_UNAVAILABLE', 'The media storage gateway returned an unexpected response.');
  }
  return body.data.file;
}

/** Small documents: one multipart POST. */
async function gatewayDirectUpload(meta: GatewayUploadMeta, file: UploadInput): Promise<GatewayFile> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), meta.uploadName);
  form.append('title', meta.title);
  form.append('category', meta.category);
  form.append('description', meta.description);
  form.append('tags', JSON.stringify(meta.tags));
  const { status, body } = await gatewayFetch<{ file: GatewayFile }>('POST', '/files', { body: form });
  return requireGatewayFile(status, body, 'upload');
}

/** Large documents: init (metadata) → PUT bytes to the signed object URL → complete (verify + activate). */
async function gatewayPresignedUpload(meta: GatewayUploadMeta, file: UploadInput): Promise<GatewayFile> {
  const json = { 'Content-Type': 'application/json' };
  const init = await gatewayFetch<{ file: GatewayFile; uploadUrl: string; uploadMethod?: string; uploadHeaders?: Record<string, string> }>(
    'POST',
    '/storage/upload/init',
    {
      headers: json,
      body: JSON.stringify({
        originalName: meta.uploadName,
        size: file.size,
        mimeType: file.mimetype,
        title: meta.title,
        description: meta.description,
        category: meta.category,
        tags: meta.tags,
      }),
    },
  );
  const pending = requireGatewayFile(init.status, init.body, 'upload init');
  const uploadUrl = init.body.data?.uploadUrl;
  if (!uploadUrl) throw new ApiError(502, 'STORAGE_UNAVAILABLE', 'The media storage gateway did not return an upload URL.');

  let put: Response;
  try {
    put = await fetch(uploadUrl, {
      method: init.body.data?.uploadMethod || 'PUT',
      headers: { 'Content-Type': file.mimetype, ...(init.body.data?.uploadHeaders ?? {}), 'Content-Length': String(file.size) },
      body: new Uint8Array(file.buffer),
      signal: AbortSignal.timeout(Math.max(config.storage.gateway.timeoutMs, 120_000)),
    });
  } catch (error) {
    logger.error('storage: presigned PUT failed', { fileId: pending.id, reason: (error as Error).message });
    throw new ApiError(502, 'STORAGE_UNAVAILABLE', 'The media object store could not be reached. Please try again shortly.');
  }
  if (!put.ok) {
    logger.error('storage: object store rejected the presigned upload', { fileId: pending.id, status: put.status, body: (await put.text().catch(() => '')).slice(0, 300) });
    throw new ApiError(502, 'STORAGE_UNAVAILABLE', 'The media object store rejected the upload. Please try again shortly.');
  }

  const done = await gatewayFetch<{ file: GatewayFile }>('POST', '/storage/upload/complete', { headers: json, body: JSON.stringify({ fileId: pending.id }) });
  return requireGatewayFile(done.status, done.body, 'upload complete');
}

async function putToGateway(key: string, folder: string, file: UploadInput): Promise<StoredFile> {
  const meta = gatewayUploadMeta(key, folder, file);
  const stored = file.size > GATEWAY_DIRECT_UPLOAD_MAX_BYTES ? await gatewayPresignedUpload(meta, file) : await gatewayDirectUpload(meta, file);
  const uploadName = meta.uploadName;

  // Objects are private on the gateway (signed URLs expire), so the public URL
  // is this service's own stable redirector, which mints a fresh link on demand.
  // The trailing file name is cosmetic (nicer downloads); only the id is used.
  const base = config.publicUrl || '';
  const prettyName = (stored.originalName || uploadName).replace(/[^\w.\-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'file';
  return {
    url: `${base}/api/v1/media/${encodeURIComponent(stored.id)}/${encodeURIComponent(prettyName)}`,
    key: `${GATEWAY_KEY_PREFIX}${stored.id}`,
    bytes: Number(stored.size) || file.size,
    mime: stored.mimeType || file.mimetype,
    originalName: stored.originalName || file.originalname,
  };
}

async function deleteFromGateway(key: string): Promise<void> {
  const id = gatewayFileIdFromKey(key);
  if (!id) return;
  const { status, body } = await gatewayFetch<unknown>('DELETE', `/files/${encodeURIComponent(id)}`);
  // 404/409 → already gone or already trashed: nothing left to do.
  if (!body.success && status !== 404 && status !== 409) logger.warn('storage: gateway delete failed', { key, status, code: body.error?.code });
}

/**
 * Resolves a short-lived, signed download URL for a file stored on the gateway.
 * Used by the `/api/v1/media/:id` redirector so stored URLs stay permanent.
 */
export async function resolveGatewayDownload(id: string): Promise<{ url: string; expiresAt: string; filename: string; mimeType: string; size: number }> {
  if (!GATEWAY_ID_PATTERN.test(id)) throw notFound('Unknown media id.');
  const { status, body } = await gatewayFetch<{ url: string; expiresAt: string; filename: string; size: number; mimeType: string }>('GET', `/files/${encodeURIComponent(id)}/download`);
  if (!body.success || !body.data?.url) throw gatewayError(status, body, 'download');
  return body.data;
}

/** Liveness probe of the configured gateway — surfaced by the admin diagnostics. */
export async function checkGatewayHealth(): Promise<{ ok: boolean; status: number; service?: string; version?: string; blobConfigured?: boolean; error?: string }> {
  if (!config.storage.gateway.url) return { ok: false, status: 0, error: 'STORAGE_GATEWAY_URL is not set' };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(config.storage.gateway.timeoutMs, 10_000));
    const response = await fetch(`${config.storage.gateway.url}/health`, { headers: { Accept: 'application/json' }, signal: controller.signal }).finally(() => clearTimeout(timer));
    const data = (await response.json().catch(() => ({}))) as { status?: string; service?: string; version?: string; blobConfigured?: boolean };
    return { ok: response.ok && data.status === 'ok', status: response.status, service: data.service, version: data.version, blobConfigured: data.blobConfigured };
  } catch (error) {
    return { ok: false, status: 0, error: (error as Error).message };
  }
}

async function putToLocal(key: string, file: UploadInput): Promise<StoredFile> {
  const absolute = path.join(config.storage.localDir, key);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, file.buffer);
  const base = config.publicUrl || '';
  return {
    url: `${base}/uploads/${key}`,
    key,
    bytes: file.size,
    mime: file.mimetype,
    originalName: file.originalname,
  };
}

async function deleteLocal(key: string): Promise<void> {
  const absolute = path.join(config.storage.localDir, key);
  if (!absolute.startsWith(config.storage.localDir)) return;
  await fs.rm(absolute, { force: true });
}

/**
 * Persists an uploaded file with the configured driver:
 *   gateway → the project's Storage Gateway (production default)
 *   s3      → any S3-compatible object store
 *   local   → ./uploads on disk (development; Render's filesystem is ephemeral)
 */
export async function storeUpload(folder: string, file: UploadInput): Promise<StoredFile> {
  assertUploadAllowed(file);
  const key = buildKey(folder, file);
  if (config.storage.driver === 'gateway') return putToGateway(key, folder, file);
  if (config.storage.driver === 's3') return putToS3(key, file);
  return putToLocal(key, file);
}

export async function deleteUpload(url: string, key?: string): Promise<void> {
  if (!url && !key) return;
  // Gateway keys are self-describing (`gw:<id>`), so they are honoured whatever
  // the active driver is — rows written before a driver switch still clean up.
  if (key && gatewayFileIdFromKey(key)) {
    await deleteFromGateway(key);
    return;
  }
  if (config.storage.driver === 'gateway') return;
  if (config.storage.driver === 's3') {
    if (key) await deleteFromS3(key);
    return;
  }
  const relative = key ?? url.split('/uploads/')[1];
  if (relative) await deleteLocal(relative.split('?')[0]);
}

/** Multer memory-storage filter — validates type and size before buffering. */
export function multerFileFilter(
  _req: unknown,
  file: { mimetype: string },
  callback: (error: Error | null, accept: boolean) => void,
): void {
  if (!(config.storage.allowedMimeTypes as readonly string[]).includes(file.mimetype)) {
    callback(badRequest(`File type "${file.mimetype}" is not allowed. Accepted: images, PDF, MP4/WebM, MP3, TXT.`), false);
    return;
  }
  callback(null, true);
}
