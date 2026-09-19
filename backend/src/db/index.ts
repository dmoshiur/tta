import pg from 'pg';
import { config } from '../config.ts';
import { logger } from '../lib/logger.ts';
import { notFound } from '../lib/errors.ts';

export type Row = Record<string, any>;

interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: Row[]; rowCount: number | null }>;
}

let pool: Queryable | null = null;
/** True when no DATABASE_URL was supplied and the disposable in-memory database is in use. */
export let inMemory = false;

export async function initPool(): Promise<void> {
  if (pool) return;
  if (config.databaseUrl) {
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: config.isProduction ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    }) as unknown as Queryable;
    inMemory = false;
    logger.info('database: connected to PostgreSQL');
  } else {
    const { newDb } = await import('pg-mem');
    const memory = newDb({ autoCreateForeignKeyIndices: true });
    pool = new (memory.adapters.createPg().Pool)() as Queryable;
    inMemory = true;
    logger.warn('database: DATABASE_URL is not set — using the disposable in-memory database (data is lost on restart)');
  }
}

export function db(): Queryable {
  if (!pool) throw new Error('Database pool is not initialised. Call initPool() first.');
  return pool;
}

export async function all<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await db().query(sql, params);
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
  const result = await db().query(sql, params);
  return result.rowCount ?? result.rows.length ?? 0;
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

/** Builds and runs an INSERT ... RETURNING *. JSONB values must already be stringified with `json()`. */
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

/**
 * Runs `work` inside a transaction on PostgreSQL. The in-memory development
 * database has no transaction support, so statements simply run in sequence.
 */
export async function withTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  if (inMemory) return work({ all, one, run });
  const client = await (pool as unknown as pg.Pool).connect();
  try {
    await client.query('BEGIN');
    const tx: Tx = {
      all: async <R = Row>(sql: string, params: unknown[] = []): Promise<R[]> =>
        (await client.query(sql, params as any[])).rows as unknown as R[],
      one: async <R = Row>(sql: string, params: unknown[] = []): Promise<R | undefined> =>
        ((await client.query(sql, params as any[])).rows as unknown as R[])[0],
      run: async (sql: string, params: unknown[] = []): Promise<number> =>
        (await client.query(sql, params as any[])).rowCount ?? 0,
    };
    const result = await work(tx);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* connection already broken */
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  const candidate = pool as unknown as pg.Pool | null;
  pool = null;
  if (candidate && typeof candidate.end === 'function') await candidate.end();
}
