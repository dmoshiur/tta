/** Application error type — carries an HTTP status and a stable machine-readable code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) => new ApiError(400, 'BAD_REQUEST', message, details);
export const validationError = (details: unknown) => new ApiError(400, 'VALIDATION_ERROR', 'Validation failed.', details);
export const unauthorized = (message = 'Authentication is required.') => new ApiError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have permission to do that.') => new ApiError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Resource not found.') => new ApiError(404, 'NOT_FOUND', message);
export const conflict = (message: string, code = 'CONFLICT') => new ApiError(409, code, message);
export const tooMany = (message = 'Too many requests.') => new ApiError(429, 'RATE_LIMITED', message);
