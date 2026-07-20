import { z } from 'zod';
import { isoDateOnlySchema } from '@/validation';
import { assertOrderDeliveryDates } from './validation';

export const poReviseSchema = z
  .object({
    orderDate: isoDateOnlySchema,
    expectedDeliveryDate: isoDateOnlySchema,
    paymentTerms: z.string().max(500),
    taxes: z.coerce.number().min(0, 'Taxes must be ≥ 0'),
    freight: z.coerce.number().min(0, 'Freight must be ≥ 0'),
    discount: z.coerce.number().min(0, 'Discount must be ≥ 0'),
    terms: z.string().max(5000),
  })
  .superRefine((values, ctx) => {
    const check = assertOrderDeliveryDates(
      values.orderDate,
      values.expectedDeliveryDate,
    );
    if (!check.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: check.message,
        path: ['expectedDeliveryDate'],
      });
    }
  });

export type PoReviseFormValues = z.infer<typeof poReviseSchema>;
