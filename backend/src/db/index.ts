import fs from 'node:fs';
import path from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { config, repoRoot } from '../config.ts';
import { logger } from '../lib/logger.ts';
import { notFound } from '../lib/errors.ts';

export type Row = Record<string, any>;

/**
 * Database layer — Turso (libsql/SQLite) in production, local SQLite files in
 * development, in-memory SQLite in tests.
 *
 * `DATABASE_URL` accepts:
 *   • libsql://user:pass@db.turso.io          (Turso, username + password)
 *   • libsql://...?authToken=<token>          (Turso, auth token)
 *   • file:/absolute/path/to/db.sqlite        (any local file)
 *   • (unset)                                  → file in ./data (dev) or :memory: (test)
 *
 * The application was originally written against PostgreSQL. To keep the query
 * catalogue portable, every statement is passed through `toSqlite()` which
 * rewrites the small number of PostgreSQL-isms the codebase uses
 * ($N parameters, NOW(), ILIKE, ::int casts, CONCAT()) into SQLite syntax.
 */

let client: Client | null = null;
/** True when the in-memory SQLite database is in use (tests). */
export let inMemory = false;
/** True when a real file-backed SQLite database is in use (development). */
export let fileBacked = false;

function resolveDatabaseUrl(): { url: string; mode: 'turso' | 'file' | 'memory' } {
  const url = config.databaseUrl;
  if (url) {
    if (url.startsWith('libsql://')) return { url, mode: 'turso' };
    return { url, mode: 'file' };
  }
  if (config.isTest) return { url: 'file::memory:', mode: 'memory' };
  const dir = path.join(repoRoot, 'data');
  fs.mkdirSync(dir, { recursive: true });
  return { url: `file:${path.join(dir, 'thinktank.sqlite')}`, mode: 'file' };
}

export async function initPool(): Promise<void> {
  if (client) return;
  const { url, mode } = resolveDatabaseUrl();
  client = createClient({ url });
  inMemory = mode === 'memory';
  fileBacked = mode === 'file';

  if (mode === 'turso') {
    logger.info('database: connected to Turso (libsql over HTTPS)');
  } else if (mode === 'memory') {
    logger.warn('database: using the disposable in-memory SQLite database (data is lost on restart)');
  } else {
    logger.info(`database: using local SQLite file database`);
  }
}

export function db(): Client {
  if (!client) throw new Error('Database client is not initialised. Call initPool() first.');
  return client;
}

// ── PostgreSQL → SQLite statement compatibility ────────────────────────────

/**
 * Rewrites a PostgreSQL-flavoured statement for SQLite:
 *   • $N positional parameters → `?` (values repeated where $N is reused)
 *   • NOW()                     → strftime('%Y-%m-%dT%H:%M:%fZ','now')
 *   • ILIKE                     → LIKE (case-insensitive for ASCII in SQLite)
 *   • expr::int / expr::INT     → expr
 *   • CONCAT(a, b, …)           → a || b || …
 *
 * String literals are respected, so `$` or `NOW()` inside quotes is untouched.
 */
export function toSqlite(sql: string, params: unknown[]): { sql: string; args: unknown[] } {
  let out = '';
  const args: unknown[] = [];
  let i = 0;
  let inString = false;

  const push = (s: string) => {
    out += s;
  };

  while (i < sql.length) {
    const ch = sql[i];

    if (inString) {
      push(ch);
      i += 1;
      if (ch === "'" && sql[i] === "'") {
        // Escaped quote inside a SQLite/PG string literal
        push("'");
        i += 1;
      } else if (ch === "'") {
        inString = false;
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      push(ch);
      i += 1;
      continue;
    }

    // $N parameter placeholder
    if (ch === '$' && i + 1 < sql.length && Number.isFinite(Number(sql[i + 1]))) {
      let n = '';
      let j = i + 1;
      while (j < sql.length && Number.isFinite(Number(sql[j]))) {
        n += sql[j];
        j += 1;
      }
      const index = Number.parseInt(n, 10) - 1;
      push('?');
      args.push(index >= 0 && index < params.length ? params[index] : null);
      i = j;
      continue;
    }

    // NOW()
    const lower = sql.slice(i, i + 4).toUpperCase();
    if (lower === 'NOW(' && sql[i + 4] === ')') {
      push("(strftime('%Y-%m-%dT%H:%M:%fZ','now'))");
      i += 5;
      continue;
    }

    // ILIKE
    if (lower === 'ILIK' && sql[i + 4]?.toUpperCase() === 'E' && !/[A-Z_]/i.test(sql[i + 5] ?? '')) {
      push('LIKE');
      i += 5;
      continue;
    }

    // ::int cast
    if (ch === ':' && sql[i + 1] === ':') {
      const rest = sql.slice(i + 2);
      const match = /^(int|integer|bigint|smallint)\b/i.exec(rest);
      if (match) {
        i += 2 + match[0].length;
        continue; // cast is a no-op in SQLite
      }
      push('::');
      i += 2;
      continue;
    }

    // CONCAT(...) → a || b
    if (lower === 'CONC' && sql.slice(i, i + 6).toUpperCase() === 'CONCAT' && sql[i + 6] === '(') {
      let depth = 1;
      let j = i + 7;
      let start = j;
      const parts: string[] = [];
      let inPartString = false;
      while (j < sql.length && depth > 0) {
        const c = sql[j];
        if (inPartString) {
          if (c === "'" && sql[j + 1] === "'") j += 1;
          else if (c === "'") inPartString = false;
        } else if (c === "'") {
          inPartString = true;
        } else if (c === '(') {
          depth += 1;
        } else if (c === ')') {
          depth -= 1;
          if (depth === 0) break;
        } else if (c === ',' && depth === 1) {
          parts.push(sql.slice(start, j));
          start = j + 1;
        }
        j += 1;
      }
      parts.push(sql.slice(start, j));
      push(parts.map((p) => p.trim()).filter(Boolean).join(' || '));
      i = j + 1;
      continue;
    }

    push(ch);
    i += 1;
  }

  return { sql: out, args };
}

/** Normalises a value before binding: arrays/objects become JSON text (SQLite stores them as TEXT). */
function bindValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  return value;
}

async function execute(sql: string, params: unknown[] = []) {
  const { sql: sqliteSql, args } = toSqlite(sql, params.map(bindValue));
  return db().execute({ sql: sqliteSql, args: args as any[] });
}

export async function all<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await execute(sql, params);
  return result.rows as T[];
}

export async function one<T = Row>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await all<T>(sql, params);
  return rows[0];
}

export async function mustOne<T = Row>(sql: string, params: unknown[] = [], message = 'Resource not found.'): Promise<T> {
  const row = await one<T>(sql, params);
  if (!row) throw notFound(message);
  return row;
}

export async function run(sql: string, params: unknown[] = []): Promise<number> {
  const result = await execute(sql, params);
  return result.rowsAffected;
}

export async function exists(sql: string, params: unknown[] = []): Promise<boolean> {
  const row = await one<{ found: number }>(`SELECT EXISTS(${sql}) AS found`, params);
  if (row) return Boolean(row.found);
  return (await all(sql, params)).length > 0;
}

export async function count(table: string, where?: string, params: unknown[] = []): Promise<number> {
  const row = await one<{ total: number }>(`SELECT COUNT(*)::int AS total FROM ${table}${where ? ` WHERE ${where}` : ''}`, params);
  return Number(row?.total ?? 0);
}

function entries(values: Record<string, unknown>): [string, unknown][] {
  return Object.entries(values).filter(([, v]) => v !== undefined);
}

/** Builds and runs an INSERT ... RETURNING *. Array/object values are JSON-encoded by the binder. */
export async function insert(table: string, values: Record<string, unknown>): Promise<Row> {
  const pairs = entries(values);
  if (!pairs.length) throw new Error(`insert(${table}) requires at least one column`);
  const columns = pairs.map(([key]) => key).join(', ');
  const placeholders = pairs.map((_, index) => `$${index + 1}`).join(', ');
  const row = await one<Row>(
    `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
    pairs.map(([, value]) => value),
  );
  if (!row) throw new Error(`insert(${table}) did not return a row`);
  return row;
}

/** Builds and runs an UPDATE ... WHERE id = $n RETURNING *. */
export async function update(table: string, id: string, values: Record<string, unknown>, idColumn = 'id'): Promise<Row | undefined> {
  const pairs = entries(values);
  if (!pairs.length) return one<Row>(`SELECT * FROM ${table} WHERE ${idColumn} = $1`, [id]);
  const assignments = pairs.map(([key], index) => `${key} = $${index + 1}`).join(', ');
  return one<Row>(
    `UPDATE ${table} SET ${assignments} WHERE ${idColumn} = $${pairs.length + 1} RETURNING *`,
    [...pairs.map(([, value]) => value), id],
  );
}

export async function remove(table: string, where: string, params: unknown[] = []): Promise<number> {
  return run(`DELETE FROM ${table} WHERE ${where}`, params);
}

export interface Tx {
  all: <T = Row>(sql: string, params?: unknown[]) => Promise<T[]>;
  one: <T = Row>(sql: string, params?: unknown[]) => Promise<T | undefined>;
  run: (sql: string, params?: unknown[]) => Promise<number>;
}

/** Runs `work` inside a transaction. Works on Turso, local files and in-memory SQLite alike. */
export async function withTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  const tx = await db().transaction('write');
  try {
    const api: Tx = {
      all: async <R = Row>(sql: string, params: unknown[] = []): Promise<R[]> => {
        const { sql: sqliteSql, args } = toSqlite(sql, params.map(bindValue));
        return (await tx.execute({ sql: sqliteSql, args: args as any[] })).rows as unknown as R[];
      },
      one: async <R = Row>(sql: string, params: unknown[] = []): Promise<R | undefined> => {
        const rows = await api.all<R>(sql, params);
        return rows[0];
      },
      run: async (sql: string, params: unknown[] = []): Promise<number> => {
        const { sql: sqliteSql, args } = toSqlite(sql, params.map(bindValue));
        return (await tx.execute({ sql: sqliteSql, args: args as any[] })).rowsAffected;
      },
    };
    const result = await work(api);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback().catch(() => undefined);
    throw error;
  } finally {
    tx.close();
  }
}

export async function closePool(): Promise<void> {
  const candidate = client;
  client = null;
  if (candidate && typeof candidate.close === 'function') await candidate.close();
}
