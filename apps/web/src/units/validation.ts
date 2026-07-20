import { z } from 'zod';
import { isValidUnitStatusTransition } from './statusTransitions';
import {
  UnitFacing,
  UnitStatus,
  UnitType,
  type CreateUnitInput,
  type PublicUnit,
  type UnitStatus as Status,
  type UpdateUnitInput,
} from './types';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const unitTypeSchema = z.enum([
  UnitType.Studio,
  UnitType.OneBhk,
  UnitType.TwoBhk,
  UnitType.ThreeBhk,
  UnitType.FourBhk,
  UnitType.Penthouse,
  UnitType.Villa,
  UnitType.Shop,
  UnitType.Office,
  UnitType.Plot,
  UnitType.Other,
]);

const unitFacingSchema = z.enum([
  UnitFacing.North,
  UnitFacing.South,
  UnitFacing.East,
  UnitFacing.West,
  UnitFacing.NorthEast,
  UnitFacing.NorthWest,
  UnitFacing.SouthEast,
  UnitFacing.SouthWest,
  UnitFacing.Other,
]);

const unitStatusSchema = z.enum([
  UnitStatus.Available,
  UnitStatus.Held,
  UnitStatus.Reserved,
  UnitStatus.Booked,
  UnitStatus.AgreementExecuted,
  UnitStatus.Registered,
  UnitStatus.Cancelled,
  UnitStatus.Blocked,
]);

function normalizeLabel(value: string): string {
  return value.trim().toUpperCase();
}

export function computeTotalPrice(input: {
  basePrice: number;
  additionalCharges: number;
  tax: number;
}): number {
  return Math.round((input.basePrice + input.additionalCharges + input.tax) * 100) / 100;
}

/**
 * Client uniqueness check against an in-memory inventory slice.
 * Nest remains authoritative (`409` on `(projectId, block, unitNumber)`).
 */
export function assertUniqueUnitInList(input: {
  projectId: string;
  block: string;
  unitNumber: string;
  existing: readonly PublicUnit[];
  excludeId?: string;
}): { ok: true } | { ok: false; message: string } {
  const block = normalizeLabel(input.block);
  const unitNumber = normalizeLabel(input.unitNumber);
  if (!block || !unitNumber) {
    return { ok: false, message: 'Block and unit number are required' };
  }

  const clash = input.existing.find(
    (row) =>
      row.projectId === input.projectId &&
      row.block === block &&
      row.unitNumber === unitNumber &&
      row.id !== input.excludeId,
  );
  if (clash) {
    return {
      ok: false,
      message: `Unit number ${unitNumber} already exists in project block ${block}`,
    };
  }
  return { ok: true };
}

export function assertUnitStatusTransition(
  from: Status,
  to: Status,
): { ok: true } | { ok: false; message: string } {
  if (!isValidUnitStatusTransition(from, to)) {
    return {
      ok: false,
      message: `Invalid unit status transition from "${from}" to "${to}"`,
    };
  }
  return { ok: true };
}

export const unitFormSchema = z
  .object({
    projectId: z.string().regex(OBJECT_ID_RE, 'Invalid project'),
    block: z.string().trim().min(1, 'Block is required').max(40),
    floor: z.string().trim().min(1, 'Floor is required').max(40),
    unitNumber: z.string().trim().min(1, 'Unit number is required').max(40),
    unitType: unitTypeSchema,
    carpetArea: z.coerce.number().min(0, 'Carpet area must be ≥ 0'),
    builtUpArea: z.coerce.number().min(0, 'Built-up area must be ≥ 0'),
    uds: z.coerce.number().min(0, 'UDS must be ≥ 0'),
    facing: z.union([unitFacingSchema, z.literal('')]).optional(),
    parking: z.string().max(120).optional(),
    basePrice: z.coerce.number().min(0, 'Base price must be ≥ 0'),
    additionalCharges: z.coerce.number().min(0, 'Additional charges must be ≥ 0'),
    tax: z.coerce.number().min(0, 'Tax must be ≥ 0'),
    status: z.enum([UnitStatus.Available, UnitStatus.Blocked]),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.builtUpArea + 1e-9 < val.carpetArea) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Built-up area should be ≥ carpet area',
        path: ['builtUpArea'],
      });
    }
  });

export type UnitFormValues = z.infer<typeof unitFormSchema>;

export function toCreateUnitInput(values: UnitFormValues): CreateUnitInput {
  return {
    projectId: values.projectId,
    block: values.block.trim(),
    floor: values.floor.trim(),
    unitNumber: values.unitNumber.trim(),
    unitType: values.unitType,
    carpetArea: values.carpetArea,
    builtUpArea: values.builtUpArea,
    uds: values.uds,
    facing: values.facing ? values.facing : null,
    parking: values.parking?.trim() || null,
    basePrice: values.basePrice,
    additionalCharges: values.additionalCharges,
    tax: values.tax,
    status: values.status,
    notes: values.notes?.trim() || null,
  };
}

export const unitUpdateSchema = z
  .object({
    block: z.string().trim().min(1).max(40),
    floor: z.string().trim().min(1).max(40),
    unitNumber: z.string().trim().min(1).max(40),
    unitType: unitTypeSchema,
    carpetArea: z.coerce.number().min(0),
    builtUpArea: z.coerce.number().min(0),
    uds: z.coerce.number().min(0),
    facing: z.union([unitFacingSchema, z.literal('')]).optional(),
    parking: z.string().max(120).optional(),
    basePrice: z.coerce.number().min(0),
    additionalCharges: z.coerce.number().min(0),
    tax: z.coerce.number().min(0),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.builtUpArea + 1e-9 < val.carpetArea) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Built-up area should be ≥ carpet area',
        path: ['builtUpArea'],
      });
    }
  });

export type UnitUpdateFormValues = z.infer<typeof unitUpdateSchema>;

export function toUpdateUnitInput(
  values: UnitUpdateFormValues,
): UpdateUnitInput {
  return {
    block: values.block.trim(),
    floor: values.floor.trim(),
    unitNumber: values.unitNumber.trim(),
    unitType: values.unitType,
    carpetArea: values.carpetArea,
    builtUpArea: values.builtUpArea,
    uds: values.uds,
    facing: values.facing ? values.facing : null,
    parking: values.parking?.trim() || null,
    basePrice: values.basePrice,
    additionalCharges: values.additionalCharges,
    tax: values.tax,
    notes: values.notes?.trim() || null,
  };
}

export const changeUnitStatusSchema = z.object({
  status: unitStatusSchema,
  notes: z.string().max(2000).optional(),
});

export type ChangeUnitStatusFormValues = z.infer<typeof changeUnitStatusSchema>;
