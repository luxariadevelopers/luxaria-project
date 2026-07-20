import { z } from 'zod';
import { BoqUnit } from './units';
import {
  MaterialCoefficientStatus,
  type PublicMaterialCoefficient,
} from './types';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const OPEN_STATUSES = new Set<MaterialCoefficientStatus>([
  MaterialCoefficientStatus.Draft,
  MaterialCoefficientStatus.PendingApproval,
]);

const ACTIVE_STATUS = MaterialCoefficientStatus.Active;

/** Mirrors Nest `normalizeWorkType`. */
export function normalizeWorkType(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    throw new Error('workType cannot be empty');
  }
  return trimmed;
}

/** Mirrors Nest `assertBoqOrWorkType`. */
export function assertBoqOrWorkType(input: {
  boqItemId?: string | null;
  workType?: string | null;
}): { ok: true } | { ok: false; message: string } {
  const hasBoq = Boolean(input.boqItemId);
  const hasWork = Boolean(input.workType?.trim());
  if (!hasBoq && !hasWork) {
    return { ok: false, message: 'Either BOQ item or work type is required' };
  }
  return { ok: true };
}

/** Mirrors Nest `assertQuantityAndWastage` with positive quantity for UI. */
export function assertQuantityAndWastage(
  quantityPerUnit: number,
  wastagePercentage: number,
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(quantityPerUnit) || quantityPerUnit <= 0) {
    return { ok: false, message: 'Standard consumption must be greater than 0' };
  }
  if (
    !Number.isFinite(wastagePercentage) ||
    wastagePercentage < 0 ||
    wastagePercentage > 100
  ) {
    return {
      ok: false,
      message: 'Wastage percentage must be between 0 and 100',
    };
  }
  return { ok: true };
}

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function roundPct(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Effective consumption including wastage allowance. */
export function effectiveQuantityPerUnit(
  quantityPerUnit: number,
  wastagePercentage: number,
): number {
  return roundQty(quantityPerUnit * (1 + wastagePercentage / 100));
}

/** Mirrors Nest `buildScopeKey`. */
export function buildScopeKey(input: {
  projectId?: string | null;
  boqItemId?: string | null;
  workType?: string | null;
  materialId: string;
  outputUnit: BoqUnit;
}): string {
  const boqCheck = assertBoqOrWorkType(input);
  if (!boqCheck.ok) {
    throw new Error(boqCheck.message);
  }
  const workPart = input.boqItemId
    ? `boq:${input.boqItemId}`
    : `wt:${normalizeWorkType(input.workType!).toLowerCase()}`;
  const matPart = `mat:${input.materialId}`;
  const unitPart = String(input.outputUnit);
  if (input.projectId) {
    return `p:${input.projectId}|${workPart}|${matPart}|${unitPart}`;
  }
  return `g|${workPart}|${matPart}|${unitPart}`;
}

/**
 * Client preview of Nest one-open-version rule (draft / pending_approval per scope).
 */
export function assertNoOpenVersionForScope(
  scopeKey: string,
  existing: ReadonlyArray<PublicMaterialCoefficient>,
  excludeId?: string,
): { ok: true } | { ok: false; message: string } {
  const conflict = existing.find(
    (row) =>
      row.scopeKey === scopeKey &&
      OPEN_STATUSES.has(row.status) &&
      row.id !== excludeId,
  );
  if (conflict) {
    return {
      ok: false,
      message: `An open ${conflict.status.replace('_', ' ')} version already exists for this scope (${conflict.standardNumber})`,
    };
  }
  return { ok: true };
}

/**
 * Client preview: only one active version per scope (DB unique index).
 * Used before create when an active row already exists without a closed version cycle.
 */
export function findActiveForScope(
  scopeKey: string,
  existing: ReadonlyArray<PublicMaterialCoefficient>,
): PublicMaterialCoefficient | undefined {
  return existing.find(
    (row) => row.scopeKey === scopeKey && row.status === ACTIVE_STATUS,
  );
}

/** Whether a new draft can be created for the scope (no open version). */
export function canCreateDraftForScope(
  scopeKey: string,
  existing: ReadonlyArray<PublicMaterialCoefficient>,
  excludeId?: string,
): boolean {
  return assertNoOpenVersionForScope(scopeKey, existing, excludeId).ok;
}

const boqUnitEnum = z.enum([
  BoqUnit.Number,
  BoqUnit.Bag,
  BoqUnit.Kilogram,
  BoqUnit.Ton,
  BoqUnit.Litre,
  BoqUnit.Metre,
  BoqUnit.SquareFoot,
  BoqUnit.CubicFoot,
  BoqUnit.SquareMetre,
  BoqUnit.CubicMetre,
  BoqUnit.RunningMetre,
  BoqUnit.Load,
  BoqUnit.Box,
  BoqUnit.Job,
  BoqUnit.Day,
  BoqUnit.LumpSum,
]);

export const coefficientFormSchema = z
  .object({
    scopeMode: z.enum(['global', 'project']),
    projectId: z.string().optional().nullable(),
    linkType: z.enum(['workType', 'boqItem']),
    boqItemId: z.string().optional().nullable(),
    workType: z.string().optional().nullable(),
    outputUnit: boqUnitEnum,
    materialId: z
      .string()
      .min(1, 'Material is required')
      .regex(OBJECT_ID_RE, 'Material id must be valid'),
    quantityPerUnit: z.coerce
      .number()
      .positive('Standard consumption must be greater than 0'),
    wastagePercentage: z.coerce
      .number()
      .min(0, 'Wastage must be ≥ 0')
      .max(100, 'Wastage must be ≤ 100'),
    effectiveDate: z.string().min(1, 'Effective date is required'),
    notes: z.string().max(2000).optional().nullable(),
    overridesStandardId: z.string().optional().nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.scopeMode === 'project' && !values.projectId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a project for project-specific standards',
        path: ['projectId'],
      });
    }

    if (values.linkType === 'boqItem') {
      if (!values.boqItemId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'BOQ item is required',
          path: ['boqItemId'],
        });
      }
    } else if (!values.workType?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Work type is required',
        path: ['workType'],
      });
    }

    const qtyCheck = assertQuantityAndWastage(
      values.quantityPerUnit,
      values.wastagePercentage,
    );
    if (!qtyCheck.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: qtyCheck.message,
        path: ['quantityPerUnit'],
      });
    }
  });

export type CoefficientFormValues = z.infer<typeof coefficientFormSchema>;

export const approveCoefficientSchema = z.object({
  approvalReference: z
    .string()
    .min(1, 'Approval reference is required')
    .max(120),
  notes: z.string().max(2000).optional().nullable(),
});

export type ApproveCoefficientFormValues = z.infer<
  typeof approveCoefficientSchema
>;

export const rejectCoefficientSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(1000),
});

export type RejectCoefficientFormValues = z.infer<
  typeof rejectCoefficientSchema
>;

export function defaultCoefficientFormValues(
  projectId?: string | null,
): CoefficientFormValues {
  return {
    scopeMode: projectId ? 'project' : 'global',
    projectId: projectId ?? null,
    linkType: 'workType',
    boqItemId: null,
    workType: '',
    outputUnit: BoqUnit.SquareFoot,
    materialId: '',
    quantityPerUnit: 0,
    wastagePercentage: 0,
    effectiveDate: new Date().toISOString().slice(0, 10),
    notes: '',
    overridesStandardId: null,
  };
}

export function shapeCoefficientCreatePayload(
  values: CoefficientFormValues,
): {
  projectId?: string | null;
  boqItemId?: string | null;
  workType?: string | null;
  outputUnit: BoqUnit;
  materialId: string;
  quantityPerUnit: number;
  wastagePercentage: number;
  effectiveDate: string;
  notes?: string | null;
  overridesStandardId?: string | null;
} {
  const projectId =
    values.scopeMode === 'project' ? values.projectId?.trim() || null : null;
  const boqItemId =
    values.linkType === 'boqItem' ? values.boqItemId?.trim() || null : null;
  const workType =
    values.linkType === 'workType'
      ? normalizeWorkType(values.workType ?? '')
      : null;

  return {
    projectId,
    boqItemId,
    workType,
    outputUnit: values.outputUnit,
    materialId: values.materialId.trim(),
    quantityPerUnit: roundQty(values.quantityPerUnit),
    wastagePercentage: roundPct(values.wastagePercentage),
    effectiveDate: values.effectiveDate,
    notes: values.notes?.trim() || null,
    overridesStandardId: values.overridesStandardId?.trim() || null,
  };
}

export function validateCreateAgainstExisting(
  values: CoefficientFormValues,
  existing: ReadonlyArray<PublicMaterialCoefficient>,
): { ok: true } | { ok: false; message: string } {
  const payload = shapeCoefficientCreatePayload(values);
  const boqCheck = assertBoqOrWorkType(payload);
  if (!boqCheck.ok) return boqCheck;

  const qtyCheck = assertQuantityAndWastage(
    payload.quantityPerUnit,
    payload.wastagePercentage,
  );
  if (!qtyCheck.ok) return qtyCheck;

  const scopeKey = buildScopeKey({
    projectId: payload.projectId,
    boqItemId: payload.boqItemId,
    workType: payload.workType,
    materialId: payload.materialId,
    outputUnit: payload.outputUnit,
  });

  return assertNoOpenVersionForScope(scopeKey, existing);
}

export function validateVersionCreateAgainstExisting(
  source: PublicMaterialCoefficient,
  existing: ReadonlyArray<PublicMaterialCoefficient>,
): { ok: true } | { ok: false; message: string } {
  if (OPEN_STATUSES.has(source.status)) {
    return {
      ok: false,
      message:
        'An open draft or pending version already exists for this standard',
    };
  }
  return assertNoOpenVersionForScope(source.scopeKey, existing);
}
