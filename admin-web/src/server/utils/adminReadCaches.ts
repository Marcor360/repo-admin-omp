import type { RequestHandler } from 'express';
import { TtlCache } from './ttlCache';

export const dashboardCache = new TtlCache<Record<string, number>>(30_000);
export const congregationsCache = new TtlCache<unknown[]>(30_000);
export const overviewCache = new TtlCache<Record<string, unknown> | null>(30_000);

export const invalidateAdminReadsAfterMutation: RequestHandler = (req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    res.once('finish', () => {
      // A handler can commit one write before a later step fails.
      if (res.statusCode >= 200 && (res.statusCode < 300 || res.statusCode >= 500)) {
        dashboardCache.clear();
        congregationsCache.clear();
        overviewCache.clear();
      }
    });
  }
  next();
};
