import type { Request, RequestHandler } from 'express';
import { ApiError } from '../../common/api-error.ts';
export const cookieName = 'cafeinn_session';
export function sessionToken(request: Request) {
  return /(?:^|;\s*)cafeinn_session=([a-f0-9]{64})(?:;|$)/.exec(request.headers.cookie ?? '')?.[1];
}
export function requireToken(request: Request) {
  const token = sessionToken(request);
  if (!token) throw new ApiError(401, 'SESSION_REQUIRED');
  return token;
}
// Per-process limit for the single Express demo instance. Expired buckets are swept lazily.
export function rateLimit(max: number): RequestHandler {
  const buckets = new Map<string, { count: number; end: number }>();
  let sweepAt = 0;
  return (req, _res, next) => {
    const now = Date.now();
    if (now >= sweepAt) {
      for (const [key, bucket] of buckets) if (bucket.end <= now) buckets.delete(key);
      sweepAt = now + 60000;
    }
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    let bucket = buckets.get(key);
    if (!bucket || bucket.end <= now) {
      bucket = { count: 0, end: now + 60000 };
      buckets.set(key, bucket);
    }
    if (++bucket.count > max) return next(new ApiError(429, 'RATE_LIMITED'));
    next();
  };
}
