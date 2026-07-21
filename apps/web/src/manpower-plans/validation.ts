import { z } from 'zod';
import type {
  CreateManpowerDailyPlanInput,
  PublicManpowerDailyPlan,
  UpdateManpowerDailyPlanInput,
} from './types';

const skillLineSchema = z.object({
  labourCategoryId: z.string().optional().nullable(),
  skill: z.string().trim().min(1, 'Skill is required').max(80),
  plannedHeadcount: z.coerce.number().min(0, 'Headcount must be ≥ 0'),
  isCritical: z.boolean().optional(),
});

export const manpowerPlanFormSchema = z
  .object({
    contractorId: z.string().min(1, 'Contractor is required'),
    planDate: z.string().min(1, 'Plan date is required'),
    useAgreementDefaults: z.boolean(),
    plannedHeadcount: z.coerce.number().min(0).optional(),
    notes: z.string().max(2000).optional().nullable(),
    skillMix: z.array(skillLineSchema),
  })
  .superRefine((values, ctx) => {
    if (!values.useAgreementDefaults && values.skillMix.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Add at least one skill line or use agreement defaults',
        path: ['skillMix'],
      });
    }
  });

export type ManpowerPlanFormValues = z.infer<typeof manpowerPlanFormSchema>;

export function defaultManpowerPlanFormValues(
  overrides: Partial<ManpowerPlanFormValues> = {},
): ManpowerPlanFormValues {
  return {
    contractorId: '',
    planDate: new Date().toISOString().slice(0, 10),
    useAgreementDefaults: true,
    plannedHeadcount: undefined,
    notes: '',
    skillMix: [],
    ...overrides,
  };
}

export function planToFormValues(
  plan: PublicManpowerDailyPlan,
): ManpowerPlanFormValues {
  return {
    contractorId: plan.contractorId,
    planDate: plan.planDate.slice(0, 10),
    useAgreementDefaults: false,
    plannedHeadcount: plan.plannedHeadcount,
    notes: plan.notes ?? '',
    skillMix: plan.skillMix.map((line) => ({
      labourCategoryId: line.labourCategoryId,
      skill: line.skill,
      plannedHeadcount: line.plannedHeadcount,
      isCritical: line.isCritical,
    })),
  };
}

export function shapeCreatePayload(
  projectId: string,
  values: ManpowerPlanFormValues,
): CreateManpowerDailyPlanInput {
  const payload: CreateManpowerDailyPlanInput = {
    projectId,
    contractorId: values.contractorId,
    planDate: values.planDate,
    notes: values.notes?.trim() || null,
  };

  if (values.useAgreementDefaults) {
    payload.useAgreementDefaults = true;
    return payload;
  }

  payload.skillMix = values.skillMix.map((line) => ({
    labourCategoryId: line.labourCategoryId || null,
    skill: line.skill.trim(),
    plannedHeadcount: line.plannedHeadcount,
    isCritical: Boolean(line.isCritical),
  }));

  if (values.plannedHeadcount != null && !Number.isNaN(values.plannedHeadcount)) {
    payload.plannedHeadcount = values.plannedHeadcount;
  }

  return payload;
}

export function shapeUpdatePayload(
  values: ManpowerPlanFormValues,
): UpdateManpowerDailyPlanInput {
  const payload: UpdateManpowerDailyPlanInput = {
    planDate: values.planDate,
    notes: values.notes?.trim() || null,
  };

  if (values.useAgreementDefaults) {
    payload.useAgreementDefaults = true;
    return payload;
  }

  payload.skillMix = values.skillMix.map((line) => ({
    labourCategoryId: line.labourCategoryId || null,
    skill: line.skill.trim(),
    plannedHeadcount: line.plannedHeadcount,
    isCritical: Boolean(line.isCritical),
  }));

  if (values.plannedHeadcount != null && !Number.isNaN(values.plannedHeadcount)) {
    payload.plannedHeadcount = values.plannedHeadcount;
  }

  return payload;
}
