import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ApiError } from '../lib/errors.ts';
import { fail } from '../lib/http.ts';
import { logger } from '../lib/logger.ts';
import { config } from '../config.ts';

/** JSON 404 for unknown API paths; the SPA fallback middleware handles everything else. */
export function apiNotFound(req: Request, res: Response): void {
  fail(res, new ApiError(404, 'NOT_FOUND', `No API route matches ${req.method} ${req.path}.`));
}

/**
 * Single error funnel. Client errors keep their message; unexpected errors are
 * logged with detail and returned as an opaque 500 so internals never leak.
 */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? `Uploads are limited to ${Math.round(config.storage.maxBytes / (1024 * 1024))} MB.`
        : `Upload failed: ${error.message}`;
    fail(res, new ApiError(400, 'UPLOAD_ERROR', message));
    return;
  }

  if (error instanceof ApiError) {
    if (error.status >= 500) logger.error(error.message, { path: req.path, stack: error.stack });
    fail(res, error);
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  logger.error('unhandled request error', { path: req.path, method: req.method, message, stack: (error as Error)?.stack });
  fail(res, new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong on our side. Please try again.'));
}
