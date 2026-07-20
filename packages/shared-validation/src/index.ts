import { z } from 'zod';

/**
 * Shared validation schemas placeholder.
 * Business schemas will be added in later phases.
 */

export const healthStatusSchema = z.object({
  status: z.literal('ok'),
  service: z.enum(['backend', 'web', 'mobile']),
  timestamp: z.string().datetime(),
});

export type HealthStatusInput = z.infer<typeof healthStatusSchema>;
