import { z } from 'zod';
import { LabourSkillLevel } from './types';

const nonNegativeRate = z.coerce
  .number({ invalid_type_error: 'Rate must be a number' })
  .finite('Rate must be a number')
  .min(0, 'Rate must be ≥ 0');

const objectIdOptional = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid ObjectId')
  .optional()
  .or(z.literal(''));

/**
 * Create/update category — mirrors Nest CreateLabourCategoryDto
 * (rates non-negative).
 */
export const labourCategoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  skillLevel: z.enum([
    LabourSkillLevel.Unskilled,
    LabourSkillLevel.SemiSkilled,
    LabourSkillLevel.Skilled,
    LabourSkillLevel.HighlySkilled,
    LabourSkillLevel.Supervisory,
  ]),
  defaultDailyRate: nonNegativeRate,
  overtimeRate: nonNegativeRate,
  notes: z.string().max(2000).optional().nullable(),
});

export type LabourCategoryFormValues = z.infer<typeof labourCategoryFormSchema>;

/**
 * Rate override — requires projectId and/or contractorId;
 * effectiveDate must be a valid date string; rates ≥ 0.
 */
export const labourCategoryRateFormSchema = z
  .object({
    projectId: objectIdOptional,
    contractorId: objectIdOptional,
    dailyRate: nonNegativeRate,
    overtimeRate: nonNegativeRate,
    effectiveDate: z
      .string()
      .trim()
      .min(1, 'Effective date is required')
      .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        message: 'Effective date is invalid',
      }),
    notes: z.string().max(2000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const projectId = value.projectId?.trim() ?? '';
    const contractorId = value.contractorId?.trim() ?? '';
    if (!projectId && !contractorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rate override requires project and/or contractor',
        path: ['projectId'],
      });
    }
  });

export type LabourCategoryRateFormValues = z.infer<
  typeof labourCategoryRateFormSchema
>;

export function defaultCategoryFormValues(
  partial?: Partial<LabourCategoryFormValues>,
): LabourCategoryFormValues {
  return {
    name: '',
    skillLevel: LabourSkillLevel.Skilled,
    defaultDailyRate: 0,
    overtimeRate: 0,
    notes: '',
    ...partial,
  };
}

export function defaultRateFormValues(
  partial?: Partial<LabourCategoryRateFormValues>,
): LabourCategoryRateFormValues {
  return {
    projectId: '',
    contractorId: '',
    dailyRate: 0,
    overtimeRate: 0,
    effectiveDate: new Date().toISOString().slice(0, 10),
    notes: '',
    ...partial,
  };
}

export function toOptionalId(
  value: string | null | undefined,
): string | null | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
