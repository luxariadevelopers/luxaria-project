import { z } from 'zod';
import { BoqUnit } from '@/boq/types';
import { moneyNonNegativeSchema } from '@/validation';
import {
  assertDateRange,
  assertManpower,
  assertRetentionPercentage,
  computeBoqLineValue,
  normalizeSkillMix,
  summarizeBoqItems,
} from './calculations';
import { ContractorAgreementBillingCycle } from './types';

const boqUnitValues = Object.values(BoqUnit) as [BoqUnit, ...BoqUnit[]];

export const agreementBoqItemSchema = z.object({
  boqItemId: z.string().optional().nullable(),
  boqCode: z.string().max(40).optional().nullable(),
  description: z.string().min(1, 'Description is required').max(500),
  unit: z.enum(boqUnitValues),
  agreedQuantity: z.coerce.number().min(0, 'Quantity must be ≥ 0'),
  agreedRate: moneyNonNegativeSchema,
});

export const agreementSkillMixSchema = z.object({
  skill: z.string().min(1, 'Skill is required').max(80),
  headcount: z.coerce.number().min(0, 'Headcount must be ≥ 0'),
});

export const agreementFormSchema = z
  .object({
    contractorId: z.string().min(1, 'Contractor is required'),
    projectId: z.string().min(1, 'Project is required'),
    workScope: z.string().min(1, 'Work scope is required').max(4000),
    boqItems: z
      .array(agreementBoqItemSchema)
      .min(1, 'At least one BOQ line is required'),
    manpowerCommitment: z.coerce.number().min(0, 'Manpower must be ≥ 0'),
    skillMix: z.array(agreementSkillMixSchema).optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    billingCycle: z.enum([
      ContractorAgreementBillingCycle.Weekly,
      ContractorAgreementBillingCycle.Fortnightly,
      ContractorAgreementBillingCycle.Monthly,
      ContractorAgreementBillingCycle.Milestone,
      ContractorAgreementBillingCycle.Completion,
    ]),
    advanceAmount: moneyNonNegativeSchema.optional(),
    advanceTerms: z.string().max(1000).optional().nullable(),
    recoveryMethod: z.string().max(120).optional().nullable(),
    recoveryPercentPerBill: z.coerce
      .number()
      .min(0)
      .max(100)
      .optional()
      .nullable(),
    recoveryNotes: z.string().max(1000).optional().nullable(),
    retentionPercentage: z.coerce
      .number()
      .min(0, 'Retention must be ≥ 0')
      .max(100, 'Retention must be ≤ 100'),
    penalties: z.string().max(4000).optional().nullable(),
    safetyTerms: z.string().max(4000).optional().nullable(),
    terminationTerms: z.string().max(4000).optional().nullable(),
    agreementDocument: z.string().max(500).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .superRefine((values, ctx) => {
    const dates = assertDateRange(values.startDate, values.endDate);
    if (!dates.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: dates.message,
        path: ['endDate'],
      });
    }

    const retention = assertRetentionPercentage(values.retentionPercentage);
    if (!retention.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: retention.message,
        path: ['retentionPercentage'],
      });
    }

    const manpower = assertManpower(values.manpowerCommitment);
    if (!manpower.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: manpower.message,
        path: ['manpowerCommitment'],
      });
    }

    const skillMix = normalizeSkillMix(values.skillMix);
    if (!skillMix.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: skillMix.message,
        path: ['skillMix'],
      });
    }

    for (let i = 0; i < values.boqItems.length; i += 1) {
      const item = values.boqItems[i]!;
      const line = computeBoqLineValue(item.agreedQuantity, item.agreedRate);
      if (!line.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: line.message,
          path: ['boqItems', i, 'agreedQuantity'],
        });
      }
    }

    const totals = summarizeBoqItems(values.boqItems);
    if (totals.agreedRatesTotal <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Agreed rates total must be greater than zero.',
        path: ['boqItems'],
      });
    }
  });

export type AgreementFormValues = z.infer<typeof agreementFormSchema>;

export const rejectAgreementSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(1000),
});

export type RejectAgreementFormValues = z.infer<typeof rejectAgreementSchema>;

export const terminateAgreementSchema = z.object({
  reason: z.string().min(1, 'Termination reason is required').max(1000),
});

export type TerminateAgreementFormValues = z.infer<
  typeof terminateAgreementSchema
>;

export function defaultAgreementFormValues(
  projectId: string,
): AgreementFormValues {
  return {
    contractorId: '',
    projectId,
    workScope: '',
    boqItems: [
      {
        boqItemId: null,
        boqCode: '',
        description: '',
        unit: BoqUnit.Number,
        agreedQuantity: 0,
        agreedRate: 0,
      },
    ],
    manpowerCommitment: 0,
    skillMix: [],
    startDate: '',
    endDate: '',
    billingCycle: ContractorAgreementBillingCycle.Monthly,
    advanceAmount: 0,
    advanceTerms: '',
    recoveryMethod: '',
    recoveryPercentPerBill: null,
    recoveryNotes: '',
    retentionPercentage: 5,
    penalties: '',
    safetyTerms: '',
    terminationTerms: '',
    agreementDocument: '',
    notes: '',
  };
}

export function agreementToFormValues(
  row: import('./types').PublicContractorAgreement,
): AgreementFormValues {
  return {
    contractorId: row.contractorId,
    projectId: row.projectId,
    workScope: row.workScope,
    boqItems: row.boqItems.map((item) => ({
      boqItemId: item.boqItemId,
      boqCode: item.boqCode ?? '',
      description: item.description,
      unit: item.unit,
      agreedQuantity: item.agreedQuantity,
      agreedRate: item.agreedRate,
    })),
    manpowerCommitment: row.manpowerCommitment,
    skillMix: row.skillMix,
    startDate: row.startDate.slice(0, 10),
    endDate: row.endDate.slice(0, 10),
    billingCycle: row.billingCycle,
    advanceAmount: row.advance.amount,
    advanceTerms: row.advance.terms ?? '',
    recoveryMethod: row.recoveryPlan.method ?? '',
    recoveryPercentPerBill: row.recoveryPlan.percentPerBill,
    recoveryNotes: row.recoveryPlan.notes ?? '',
    retentionPercentage: row.retentionPercentage,
    penalties: row.penalties ?? '',
    safetyTerms: row.safetyTerms ?? '',
    terminationTerms: row.terminationTerms ?? '',
    agreementDocument: row.agreementDocument ?? '',
    notes: row.notes ?? '',
  };
}

export function formValuesToCreateInput(
  values: AgreementFormValues,
): import('./types').CreateContractorAgreementInput {
  return {
    contractorId: values.contractorId,
    projectId: values.projectId,
    workScope: values.workScope.trim(),
    boqItems: values.boqItems.map((item) => ({
      boqItemId: item.boqItemId || null,
      boqCode: item.boqCode?.trim() || null,
      description: item.description.trim(),
      unit: item.unit,
      agreedQuantity: item.agreedQuantity,
      agreedRate: item.agreedRate,
    })),
    manpowerCommitment: values.manpowerCommitment,
    skillMix: values.skillMix?.length ? values.skillMix : undefined,
    startDate: values.startDate,
    endDate: values.endDate,
    billingCycle: values.billingCycle,
    advance: {
      amount: values.advanceAmount ?? 0,
      terms: values.advanceTerms?.trim() || null,
    },
    recoveryPlan: {
      method: values.recoveryMethod?.trim() || null,
      percentPerBill: values.recoveryPercentPerBill ?? null,
      notes: values.recoveryNotes?.trim() || null,
    },
    retentionPercentage: values.retentionPercentage,
    penalties: values.penalties?.trim() || null,
    safetyTerms: values.safetyTerms?.trim() || null,
    terminationTerms: values.terminationTerms?.trim() || null,
    agreementDocument: values.agreementDocument?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}
