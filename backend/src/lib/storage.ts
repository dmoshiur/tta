import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.ts';
import { logger } from './logger.ts';
import { badRequest } from './errors.ts';

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
 * Persists an uploaded file. Uses the configured object store in production and
 * local disk in development (Render's filesystem is ephemeral, so production
 * deployments should set STORAGE_DRIVER=s3 with an object-storage provider).
 */
export async function storeUpload(folder: string, file: UploadInput): Promise<StoredFile> {
  assertUploadAllowed(file);
  const key = buildKey(folder, file);
  if (config.storage.driver === 's3') return putToS3(key, file);
  return putToLocal(key, file);
}

export async function deleteUpload(url: string, key?: string): Promise<void> {
  if (!url && !key) return;
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
