import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { treeifyError } from 'zod';
import { ApiError, validationError } from './errors.ts';

/** Standard success envelope. */
export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

/** Standard error envelope — mirrors `ok` so clients can rely on one shape. */
export function fail(res: Response, error: ApiError): Response {
  return res.status(error.status).json({
    success: false,
    error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
  });
}

/** Wraps an async handler so rejections reach the Express error middleware (Express 5 does this too, but be explicit). */
export function route(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/** Validates a payload against a Zod schema and throws a 400 with field details on failure. */
export function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw validationError(treeifyError(result.error));
  return result.data;
}

export interface PageQuery {
  page: number;
  limit: number;
  offset: number;
}

/** Clamps pagination input so clients cannot request unbounded result sets. */
export function pagination(query: Record<string, unknown>, defaultLimit = 12, maxLimit = 50): PageQuery {
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const requested = Number.parseInt(String(query.limit ?? defaultLimit), 10) || defaultLimit;
  const limit = Math.min(Math.max(1, requested), maxLimit);
  return { page, limit, offset: (page - 1) * limit };
}

export interface Paged<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function paged<T>(items: T[], page: PageQuery, total: number): Paged<T> {
  return { items, page: page.page, limit: page.limit, total, pages: Math.max(1, Math.ceil(total / page.limit)) };
}

/** Escapes LIKE wildcards so user input cannot alter query semantics. */
export function like(term: string): string {
  return `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
}
