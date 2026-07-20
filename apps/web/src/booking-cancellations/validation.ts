import { z } from 'zod';
import { isoDateOnlySchema } from '@/validation';
import { computeApprovedRefund } from './refundMath';

/** Coerce HTML number inputs; output type remains `number`. */
const nonNegativeMoney = z.coerce
  .number({ invalid_type_error: 'Amount must be a number' })
  .finite()
  .min(0);

export const cancellationRequestSchema = z
  .object({
    bookingId: z.string().min(1, 'Booking is required'),
    cancellationReason: z
      .string()
      .trim()
      .min(3, 'Reason must be at least 3 characters')
      .max(2000),
    cancellationDate: isoDateOnlySchema,
    cancellationCharge: nonNegativeMoney,
    deductions: nonNegativeMoney,
    remarks: z.string().max(2000),
    /** Snapshot from Nest receipts after request; preview uses 0 until created. */
    totalReceivedPreview: nonNegativeMoney.optional(),
  })
  .superRefine((values, ctx) => {
    if (values.totalReceivedPreview == null) return;
    const breakdown = computeApprovedRefund({
      totalReceived: values.totalReceivedPreview,
      cancellationCharge: values.cancellationCharge,
      deductions: values.deductions,
    });
    if (!breakdown.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: breakdown.message,
        path: ['deductions'],
      });
    }
  });

export type CancellationRequestFormValues = z.infer<
  typeof cancellationRequestSchema
>;

export const cancellationReviewSchema = z
  .object({
    cancellationCharge: nonNegativeMoney,
    deductions: nonNegativeMoney,
    remarks: z.string().max(2000),
    totalReceived: nonNegativeMoney,
  })
  .superRefine((values, ctx) => {
    const breakdown = computeApprovedRefund({
      totalReceived: values.totalReceived,
      cancellationCharge: values.cancellationCharge,
      deductions: values.deductions,
    });
    if (!breakdown.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: breakdown.message,
        path: ['deductions'],
      });
    }
  });

export type CancellationReviewFormValues = z.infer<
  typeof cancellationReviewSchema
>;

export const processRefundSchema = z.object({
  refundBankAccountId: z.string().min(1, 'Refund bank account is required'),
  refundTransactionId: z
    .string()
    .trim()
    .min(3, 'Transaction id must be at least 3 characters')
    .max(120),
  refundDate: isoDateOnlySchema,
});

export type ProcessRefundFormValues = z.infer<typeof processRefundSchema>;

export const rejectCancellationSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Rejection reason must be at least 3 characters')
    .max(2000),
});

export type RejectCancellationFormValues = z.infer<
  typeof rejectCancellationSchema
>;
