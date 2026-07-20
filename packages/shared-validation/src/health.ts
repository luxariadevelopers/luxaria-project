import { z } from 'zod';

export const healthStatusSchema = z.enum(['ok', 'degraded']);

export const healthMemorySchema = z.object({
  heapUsedMb: z.number(),
  heapTotalMb: z.number(),
  rssMb: z.number(),
});

export const healthRedisSchema = z.object({
  enabled: z.boolean(),
  status: z.enum(['up', 'down', 'disabled']),
  host: z.string().nullable(),
  port: z.number().nullable(),
  latencyMs: z.number().nullable(),
});

export const healthDeliverySummarySchema = z.object({
  windowHours: z.number(),
  total: z.number(),
  sent: z.number(),
  failed: z.number(),
  pending: z.number(),
  skipped: z.number(),
  retrying: z.number(),
  threshold24h: z.number(),
  thresholdExceeded: z.boolean(),
});

export const healthChecksSchema = z.object({
  database: z.object({
    status: z.enum(['up', 'down']),
    readyState: z.number(),
    readyStateLabel: z.string(),
    host: z.string(),
    name: z.string(),
    maskedUri: z.string(),
  }),
  redis: healthRedisSchema,
  memory: healthMemorySchema,
  notifications: healthDeliverySummarySchema,
});

export const healthStatusResponseSchema = z.object({
  status: healthStatusSchema,
  service: z.enum(['backend', 'web', 'mobile']),
  environment: z.string().optional(),
  version: z.string().optional(),
  timestamp: z.string().datetime(),
  uptimeSeconds: z.number().optional(),
  checks: healthChecksSchema.optional(),
  alerts: z.array(z.string()).optional(),
});

export type HealthStatusInput = z.infer<typeof healthStatusResponseSchema>;

export const operationsHealthSchema = healthStatusResponseSchema.extend({
  alertConfig: z.object({
    deliveryFailureThreshold24h: z.number(),
    databaseDownAlertEnabled: z.boolean(),
    redisDownAlertEnabled: z.boolean(),
    errorTrackingEnabled: z.boolean(),
    errorTrackingDsnMasked: z.string().nullable(),
    opsAlertWebhookConfigured: z.boolean(),
    opsAlertWebhookMasked: z.string().nullable(),
  }),
  errorTracking: z.object({
    enabled: z.boolean(),
    active: z.boolean(),
  }),
  backgroundJobs: z.object({
    redisQueueMode: z.boolean(),
    stockReorderJobsEnabled: z.boolean(),
    dprMissingJobsEnabled: z.boolean(),
    paymentScheduleOverdueJobsEnabled: z.boolean(),
    directorDigestJobsEnabled: z.boolean(),
  }),
});

export type OperationsHealthInput = z.infer<typeof operationsHealthSchema>;
