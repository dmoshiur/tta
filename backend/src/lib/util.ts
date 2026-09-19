import crypto from 'node:crypto';

export const newId = (): string => crypto.randomUUID();

/** URL-safe slug used for courses, articles and books. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/** Guarantees a usable slug, falling back to a random suffix for e.g. non-latin titles. */
export function ensureSlug(input: string, fallback = 'item'): string {
  const slug = slugify(input);
  return slug || `${fallback}-${crypto.randomBytes(3).toString('hex')}`;
}

export function uniqueSuffix(): string {
  return crypto.randomBytes(4).toString('hex');
}

/** Reading time estimate used by article pages and cards. */
export function readingMinutes(text: string): number {
  const words = text.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Strips markup — used for excerpts, search indexes and notifications. */
export function plainText(html: string, max = 240): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Fisher–Yates shuffle — used for quiz question and option randomisation. */
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Percentage helper that never divides by zero. */
export function percentage(part: number, total: number): number {
  return total > 0 ? round((part / total) * 100, 1) : 0;
}

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isoDay(value: unknown): string {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : 'unknown';
}

/** Serialises a value for a JSONB column (works identically on PostgreSQL and pg-mem). */
export function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/** Parses a JSONB column that may arrive as an object (pg-mem) or a string. */
export function fromJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

/**
 * Normalises a tag column: SQLite/Turso returns JSON text, in-memory engines
 * may return real arrays, and very old rows may still hold PostgreSQL "{a,b}"
 * text. All shapes are accepted.
 */
export function fromArray(value: unknown): string[] {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    const text = value.trim();
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return [];
      }
    }
    if (text.startsWith('{')) {
      return text
        .slice(1, -1)
        .split(',')
        .map((x) => x.replace(/^"|"$/g, '').trim())
        .filter(Boolean);
    }
    return text
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

export function csv(value: unknown): string[] {
  return String(value ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Deterministic, non-cryptographic avatar colour for users without a picture. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
