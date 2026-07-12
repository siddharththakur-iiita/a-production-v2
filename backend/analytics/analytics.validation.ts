/**
 * src/features/analytics/analytics.validation.ts
 */
import { z } from 'zod';

export const trackEventSchema = z.object({
  eventType: z.string().min(1, 'eventType is required').max(100),
  entityType: z.string().max(50).optional(),
  entityId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  sessionId: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const logSearchQuerySchema = z.object({
  queryText: z.string().min(1, 'queryText is required').max(500),
  resultsCount: z.number().int().min(0),
  customerId: z.string().uuid().optional(),
  sessionId: z.string().max(200).optional(),
});

export const dateRangeSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((data) => data.to >= data.from, { message: 'to must be on or after from', path: ['to'] });

export type TrackEventValidated = z.infer<typeof trackEventSchema>;
export type LogSearchQueryValidated = z.infer<typeof logSearchQuerySchema>;
export type DateRangeValidated = z.infer<typeof dateRangeSchema>;
