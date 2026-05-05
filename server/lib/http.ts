import type { Context } from 'hono';

type ErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function getClientIp(c: Context): string {
  return c.req.header('CF-Connecting-IP')
    ?? c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    ?? c.req.header('X-Real-IP')
    ?? 'unknown';
}

export function jsonError(c: Context, status: 400 | 401 | 403 | 404 | 409 | 422 | 500, code: string, message: string): Response {
  const payload: ErrorPayload = {
    error: {
      code,
      message
    }
  };
  return c.json(payload, status);
}

