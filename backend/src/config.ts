/**
 * Runtime configuration.
 *
 * Every environment variable the application actually reads is declared here.
 * Nothing else in the codebase touches `process.env` directly, which keeps the
 * deployment contract (see `.env.example`) honest and testable.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

/**
 * Loads `.env` from the repository root without overwriting real environment
 * variables. Skipped under NODE_ENV=test so the suite never inherits a
 * developer's production `.env` (real Turso, SMTP or storage-gateway secrets).
 */
function loadDotEnv(file = path.join(repoRoot, '.env')): void {
  if ((process.env.NODE_ENV ?? '').trim() === 'test') return;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* No .env file is fine — platforms such as Render inject real variables. */
  }
}

loadDotEnv();

const str = (key: string, fallback = ''): string => (process.env[key] ?? fallback).trim();
const int = (key: string, fallback: number): number => {
  const parsed = Number.parseInt(str(key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const bool = (key: string, fallback: boolean): boolean => {
  const value = str(key).toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value);
};
const list = (value: string): string[] => value.split(',').map((x) => x.trim()).filter(Boolean);

export const isTest = str('NODE_ENV') === 'test';
export const isProduction = str('NODE_ENV', 'development') === 'production';

const generatedSecret = crypto.randomBytes(48).toString('hex');
const jwtSecret = str('JWT_SECRET') || generatedSecret;

export const config = {
  env: str('NODE_ENV', 'development'),
  isProduction,
  isTest,
  port: int('PORT', 3000),
  databaseUrl: str('DATABASE_URL') || str('TURSO_DATABASE_URL'),
  /**
   * Turso auth token. Read from TURSO_AUTH_TOKEN (Turso's standard variable
   * name). A `?authToken=` query parameter on DATABASE_URL still works — the
   * libsql client merges both, with the explicit variable taking precedence.
   */
  databaseAuthToken: str('TURSO_AUTH_TOKEN') || str('DATABASE_AUTH_TOKEN'),
  jwt: {
    secret: jwtSecret || generatedSecret,
    secretIsEphemeral: !jwtSecret,
    expiresIn: str('JWT_EXPIRES_IN', '7d'),
    resetTokenTtlMinutes: int('RESET_TOKEN_TTL_MINUTES', 60),
  },
  publicUrl: str('PUBLIC_URL').replace(/\/+$/, ''),
  frontendOrigins: list(str('FRONTEND_URL')),
  admin: {
    email: str('ADMIN_EMAIL').toLowerCase(),
    password: str('ADMIN_PASSWORD'),
    name: str('ADMIN_NAME', 'Administrator'),
  },
  /** The Super Admin account. Set SUPER_ADMIN_EMAIL in .env — it is seeded on boot. */
  superAdmin: {
    email: (str('SUPER_ADMIN_EMAIL') || str('ADMIN_EMAIL')).toLowerCase(),
    password: str('SUPER_ADMIN_PASSWORD') || str('ADMIN_PASSWORD'),
    name: str('SUPER_ADMIN_NAME') || str('ADMIN_NAME', 'Administrator'),
  },
  /**
   * Hacker admin (emergency operations console at /hackeradmin).
   * A short-lived passcode is generated every rotation window and e-mailed
   * to the configured operator address through SMTP.
   */
  hackerAdmin: {
    enabled: bool('HACKER_ADMIN_ENABLED', true),
    email: (str('HACKER_ADMIN_EMAIL') || 'mdmoshiurrahmanmohi1@gmail.com').toLowerCase(),
    /** Passcode lifetime in minutes — the code changes automatically after this window. */
    passcodeTtlMinutes: int('HACKER_ADMIN_PASSCODE_TTL_MINUTES', 60),
    /** Development-only fixed passcode (honoured outside production). */
    devPasscode: str('HACKER_ADMIN_DEV_PASSCODE'),
    /** Maximum passcode attempts per IP per 15 minutes. */
    maxLoginAttempts: int('HACKER_ADMIN_MAX_ATTEMPTS', 10),
  },
  seedDemoContent: bool('SEED_DEMO_CONTENT', true),
  storage: {
    /**
     * local   : ./uploads on disk (development only)
     * s3      : any S3-compatible object store (SigV4)
     * gateway : the project's own Storage Gateway (NGO File Cloud "Storage
     *           Bridge" REST API at STORAGE_GATEWAY_URL, key-id + secret auth)
     */
    driver: (str('STORAGE_DRIVER', isProduction ? 'gateway' : 'local') as 'local' | 's3' | 'gateway'),
    endpoint: str('STORAGE_ENDPOINT'),
    region: str('STORAGE_REGION', 'us-east-1'),
    bucket: str('STORAGE_BUCKET'),
    accessKeyId: str('STORAGE_ACCESS_KEY_ID'),
    secretAccessKey: str('STORAGE_SECRET_ACCESS_KEY'),
    prefix: str('STORAGE_PREFIX', 'media').replace(/^\/+|\/+$/g, ''),
    publicUrl: str('STORAGE_PUBLIC_URL').replace(/\/+$/, ''),
    gateway: {
      /** Base URL of the bridge API, e.g. https://st.thamjj13.top/api/v1 */
      url: str('STORAGE_GATEWAY_URL').replace(/\/+$/, ''),
      /** Dual-token credential issued by the gateway dashboard (ng_key_…). */
      keyId: str('STORAGE_GATEWAY_KEY_ID'),
      /** Dual-token secret (ng_live_…). Also accepted alone as a bearer token. */
      keySecret: str('STORAGE_GATEWAY_KEY_SECRET'),
      /** Network timeout for a single gateway call. */
      timeoutMs: int('STORAGE_GATEWAY_TIMEOUT_MS', 30_000),
    },
    maxBytes: int('MAX_UPLOAD_MB', 5) * 1024 * 1024,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
    ],
    localDir: path.join(repoRoot, 'uploads'),
  },
  smtp: {
    host: str('SMTP_HOST'),
    port: int('SMTP_PORT', 587),
    secure: bool('SMTP_SECURE', false),
    user: str('SMTP_USER'),
    password: str('SMTP_PASSWORD'),
    from: str('SMTP_FROM', 'ThinkTank Academia <no-reply@thinktankacademia.org>'),
  },
  firebase: {
    projectId: str('FIREBASE_PROJECT_ID'),
    clientEmail: str('FIREBASE_CLIENT_EMAIL'),
    privateKey: str('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  },
  rateLimit: {
    windowMs: int('RATE_LIMIT_WINDOW_MS', 60_000),
    max: int('RATE_LIMIT_MAX', 240),
  },
  site: {
    name: 'ThinkTank Academia',
    tagline: 'Learn • Think • Understand • Unite',
  },
} as const;

export const pushEnabled = Boolean(
  config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey,
);
export const mailEnabled = Boolean(config.smtp.host);
export const storageConfigured =
  config.storage.driver === 's3'
    ? Boolean(config.storage.endpoint && config.storage.bucket && config.storage.accessKeyId && config.storage.secretAccessKey)
    : config.storage.driver === 'gateway'
      ? Boolean(config.storage.gateway.url && config.storage.gateway.keySecret)
      : true;
/** True for drivers that survive a redeploy (local disk on Render is ephemeral). */
export const storagePersistent = config.storage.driver === 's3' || config.storage.driver === 'gateway';
