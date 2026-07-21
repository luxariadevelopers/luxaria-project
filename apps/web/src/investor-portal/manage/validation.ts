import { z } from 'zod';
import { InvestorVisibleReportType } from './types';

const MONGO_ID = /^[a-f\d]{24}$/i;

const amountField = z.coerce
  .number({ invalid_type_error: 'Must be a number' })
  .min(0, 'Must be ≥ 0');

export const publishInvestorReportSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Max 200 characters'),
  reportType: z.enum([
    InvestorVisibleReportType.Progress,
    InvestorVisibleReportType.FinancialSummary,
    InvestorVisibleReportType.BoardUpdate,
    InvestorVisibleReportType.Other,
  ]),
  summary: z.string().max(4000, 'Max 4000 characters'),
  documentPath: z.string().max(500, 'Max 500 characters'),
});

export type PublishInvestorReportFormValues = z.infer<
  typeof publishInvestorReportSchema
>;

export const recordInvestorProfitSchema = z
  .object({
    participantId: z
      .string()
      .trim()
      .regex(MONGO_ID, 'Select a valid outside investor participant'),
    periodLabel: z.string().max(120, 'Max 120 characters'),
    allocatedAmount: amountField,
    distributedAmount: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : value),
      amountField.optional(),
    ),
    notes: z.string().max(2000, 'Max 2000 characters'),
    approvedAt: z.string(),
  })
  .superRefine((values, ctx) => {
    const distributed = values.distributedAmount ?? 0;
    if (distributed > values.allocatedAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['distributedAmount'],
        message: 'Distributed cannot exceed allocated amount',
      });
    }
  });

export type RecordInvestorProfitFormValues = {
  participantId: string;
  periodLabel: string;
  allocatedAmount: number;
  distributedAmount?: number;
  notes: string;
  approvedAt: string;
};

export const updateDistributedProfitSchema = z
  .object({
    allocationId: z
      .string()
      .trim()
      .regex(MONGO_ID, 'Allocation id must be a valid Mongo id'),
    distributedAmount: amountField,
    allocatedAmount: amountField,
  })
  .superRefine((values, ctx) => {
    if (
      values.allocatedAmount > 0 &&
      values.distributedAmount > values.allocatedAmount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['distributedAmount'],
        message: 'Distributed cannot exceed allocated amount',
      });
    }
  });

export type UpdateDistributedProfitFormValues = z.infer<
  typeof updateDistributedProfitSchema
>;
