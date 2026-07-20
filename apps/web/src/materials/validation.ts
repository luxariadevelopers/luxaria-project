import type { UpdateMaterialInput } from './types';
import { z } from 'zod';
import { MaterialStatus, MaterialUnit } from './types';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const CATEGORY_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MONEY_EPS = 1e-9;

const materialUnitSchema = z.enum([
  MaterialUnit.Number,
  MaterialUnit.Bag,
  MaterialUnit.Kilogram,
  MaterialUnit.Ton,
  MaterialUnit.Litre,
  MaterialUnit.Metre,
  MaterialUnit.SquareFoot,
  MaterialUnit.CubicFoot,
  MaterialUnit.Load,
  MaterialUnit.Box,
]);

const conversionFactorSchema = z.object({
  unit: materialUnitSchema,
  factorToBase: z.coerce.number().positive('Factor must be > 0'),
});

/**
 * Client-side mirror of Nest `assertUnitConversions` + stock/wastage rules.
 */
export function assertUnitConversions(input: {
  baseUnit: string;
  alternateUnits: string[];
  conversionFactors: { unit: string; factorToBase: number }[];
}): { ok: true } | { ok: false; message: string; path?: string } {
  const baseUnit = input.baseUnit;
  if (!Object.values(MaterialUnit).includes(baseUnit as MaterialUnit)) {
    return { ok: false, message: 'Invalid base unit', path: 'baseUnit' };
  }

  const alternateUnits = [...new Set(input.alternateUnits)];
  if (alternateUnits.includes(baseUnit)) {
    return {
      ok: false,
      message: 'Base unit cannot appear in alternate units',
      path: 'alternateUnits',
    };
  }

  for (const unit of alternateUnits) {
    if (!Object.values(MaterialUnit).includes(unit as MaterialUnit)) {
      return {
        ok: false,
        message: `Invalid alternate unit: ${unit}`,
        path: 'alternateUnits',
      };
    }
  }

  const factorByUnit = new Map<string, number>();
  for (const factor of input.conversionFactors) {
    if (!Object.values(MaterialUnit).includes(factor.unit as MaterialUnit)) {
      return {
        ok: false,
        message: `Invalid conversion unit: ${factor.unit}`,
        path: 'conversionFactors',
      };
    }
    if (factor.unit === baseUnit) {
      return {
        ok: false,
        message:
          'Conversion factors must not include the base unit (implicit factor 1)',
        path: 'conversionFactors',
      };
    }
    if (
      typeof factor.factorToBase !== 'number' ||
      !Number.isFinite(factor.factorToBase) ||
      factor.factorToBase <= MONEY_EPS
    ) {
      return {
        ok: false,
        message: `Conversion factor for ${factor.unit} must be a finite number > 0`,
        path: 'conversionFactors',
      };
    }
    if (factorByUnit.has(factor.unit)) {
      return {
        ok: false,
        message: `Duplicate conversion factor for unit ${factor.unit}`,
        path: 'conversionFactors',
      };
    }
    factorByUnit.set(factor.unit, factor.factorToBase);
  }

  for (const unit of alternateUnits) {
    if (!factorByUnit.has(unit)) {
      return {
        ok: false,
        message: `Missing conversion factor for alternate unit ${unit}`,
        path: 'conversionFactors',
      };
    }
  }

  for (const unit of factorByUnit.keys()) {
    if (!alternateUnits.includes(unit)) {
      return {
        ok: false,
        message: `Conversion factor for ${unit} is not in alternate units`,
        path: 'conversionFactors',
      };
    }
  }

  return { ok: true };
}

export function assertStockLevels(input: {
  minimumStock: number;
  reorderLevel: number;
  maximumStock: number;
}): { ok: true } | { ok: false; message: string; path?: string } {
  const { minimumStock: min, reorderLevel: reorder, maximumStock: max } = input;

  for (const [label, value] of [
    ['minimumStock', min],
    ['reorderLevel', reorder],
    ['maximumStock', max],
  ] as const) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return {
        ok: false,
        message: `${label} must be a non-negative number`,
        path: label,
      };
    }
  }

  if (min - reorder > MONEY_EPS) {
    return {
      ok: false,
      message: 'Minimum stock cannot be greater than reorder level',
      path: 'minimumStock',
    };
  }
  if (reorder - max > MONEY_EPS && max > MONEY_EPS) {
    return {
      ok: false,
      message:
        'Reorder level cannot be greater than maximum stock when maximum is set',
      path: 'reorderLevel',
    };
  }
  if (min - max > MONEY_EPS && max > MONEY_EPS) {
    return {
      ok: false,
      message:
        'Minimum stock cannot be greater than maximum stock when maximum is set',
      path: 'minimumStock',
    };
  }

  return { ok: true };
}

/**
 * Convert a quantity in `fromUnit` into base units.
 * Mirrors Nest `convertToBaseUnit`.
 */
export function convertToBaseUnit(
  quantity: number,
  fromUnit: MaterialUnit,
  baseUnit: MaterialUnit,
  conversionFactors: { unit: MaterialUnit; factorToBase: number }[],
): number {
  if (!Number.isFinite(quantity)) {
    throw new Error('Quantity must be a finite number');
  }
  if (fromUnit === baseUnit) {
    return quantity;
  }
  const factor = conversionFactors.find((f) => f.unit === fromUnit);
  if (!factor) {
    throw new Error(
      `No conversion factor from ${fromUnit} to base unit ${baseUnit}`,
    );
  }
  return quantity * factor.factorToBase;
}

export const materialFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    category: z
      .string()
      .trim()
      .min(1, 'Category is required')
      .max(64)
      .refine((v) => CATEGORY_REGEX.test(v.trim().toLowerCase()), {
        message: 'Category must be lowercase alphanumeric with optional _ or -',
      }),
    specification: z.string().max(500),
    brand: z.string().max(120),
    baseUnit: materialUnitSchema,
    alternateUnits: z.array(materialUnitSchema).max(20),
    conversionFactors: z.array(conversionFactorSchema),
    standardRate: z.coerce.number().min(0, 'Rate must be ≥ 0'),
    minimumStock: z.coerce.number().min(0, 'Must be ≥ 0'),
    reorderLevel: z.coerce.number().min(0, 'Must be ≥ 0'),
    maximumStock: z.coerce.number().min(0, 'Must be ≥ 0'),
    standardWastagePercentage: z.coerce
      .number()
      .min(0, 'Must be ≥ 0')
      .max(100, 'Must be ≤ 100'),
    ledgerAccountId: z
      .string()
      .min(1, 'Ledger account is required')
      .regex(OBJECT_ID_RE, 'Must be a valid ObjectId'),
    status: z.enum([MaterialStatus.Active, MaterialStatus.Inactive]),
  })
  .superRefine((values, ctx) => {
    const conversions = assertUnitConversions({
      baseUnit: values.baseUnit,
      alternateUnits: values.alternateUnits,
      conversionFactors: values.conversionFactors,
    });
    if (!conversions.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [conversions.path ?? 'conversionFactors'],
        message: conversions.message,
      });
    }

    const levels = assertStockLevels({
      minimumStock: values.minimumStock,
      reorderLevel: values.reorderLevel,
      maximumStock: values.maximumStock,
    });
    if (!levels.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [levels.path ?? 'reorderLevel'],
        message: levels.message,
      });
    }
  });

export type MaterialFormValues = z.infer<typeof materialFormSchema>;

export function toCreateMaterialInput(values: MaterialFormValues) {
  return {
    name: values.name.trim(),
    category: values.category.trim().toLowerCase(),
    specification: values.specification?.trim() || null,
    brand: values.brand?.trim() || null,
    baseUnit: values.baseUnit,
    alternateUnits: values.alternateUnits,
    conversionFactors: values.conversionFactors,
    standardRate: values.standardRate,
    minimumStock: values.minimumStock,
    reorderLevel: values.reorderLevel,
    maximumStock: values.maximumStock,
    standardWastagePercentage: values.standardWastagePercentage,
    ledgerAccountId: values.ledgerAccountId,
    status: values.status,
  };
}

// --- Phase 059 update validation ---

const mongoIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

const unitSchema = z.enum([
  MaterialUnit.Number,
  MaterialUnit.Bag,
  MaterialUnit.Kilogram,
  MaterialUnit.Ton,
  MaterialUnit.Litre,
  MaterialUnit.Metre,
  MaterialUnit.SquareFoot,
  MaterialUnit.CubicFoot,
  MaterialUnit.Load,
  MaterialUnit.Box,
]);

export const materialUpdateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    category: z
      .string()
      .trim()
      .min(1, 'Category is required')
      .max(64)
      .regex(
        /^[a-z0-9][a-z0-9_-]{0,63}$/,
        'Category must be lowercase alphanumeric with optional _ or -',
      ),
    specification: z.string().trim().max(500).optional().or(z.literal('')),
    brand: z.string().trim().max(120).optional().or(z.literal('')),
    baseUnit: unitSchema,
    standardRate: z.coerce.number().min(0, 'Rate must be ≥ 0'),
    minimumStock: z.coerce.number().min(0, 'Minimum stock must be ≥ 0'),
    reorderLevel: z.coerce.number().min(0, 'Reorder level must be ≥ 0'),
    maximumStock: z.coerce.number().min(0, 'Maximum stock must be ≥ 0'),
    standardWastagePercentage: z.coerce
      .number()
      .min(0, 'Wastage must be ≥ 0')
      .max(100, 'Wastage must be ≤ 100'),
    ledgerAccountId: mongoIdSchema,
    status: z.enum([MaterialStatus.Active, MaterialStatus.Inactive]),
  })
  .superRefine((values, ctx) => {
    if (values.reorderLevel < values.minimumStock) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reorderLevel'],
        message: 'Reorder level must be ≥ minimum stock',
      });
    }
    if (values.maximumStock > 0 && values.maximumStock < values.reorderLevel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maximumStock'],
        message: 'Maximum stock must be ≥ reorder level when set',
      });
    }
  });

export type MaterialUpdateFormValues = z.infer<typeof materialUpdateSchema>;

export function assertBaseUnitChangeAllowed(input: {
  currentBaseUnit: MaterialUnit;
  nextBaseUnit: MaterialUnit | undefined;
  baseUnitLocked: boolean;
}): { ok: true } | { ok: false; message: string } {
  if (input.nextBaseUnit === undefined) return { ok: true };
  if (input.nextBaseUnit === input.currentBaseUnit) return { ok: true };
  if (input.baseUnitLocked) {
    return {
      ok: false,
      message:
        'Base unit cannot be changed after stock transactions without a migration procedure',
    };
  }
  return { ok: true };
}

export function buildMaterialUpdatePayload(
  values: MaterialUpdateFormValues,
  options: {
    currentBaseUnit: MaterialUnit;
    baseUnitLocked: boolean;
  },
):
  | { ok: true; input: UpdateMaterialInput }
  | { ok: false; message: string } {
  const lockCheck = assertBaseUnitChangeAllowed({
    currentBaseUnit: options.currentBaseUnit,
    nextBaseUnit: values.baseUnit,
    baseUnitLocked: options.baseUnitLocked,
  });
  if (!lockCheck.ok) return lockCheck;

  return {
    ok: true,
    input: {
      name: values.name,
      category: values.category,
      specification: values.specification?.trim()
        ? values.specification.trim()
        : null,
      brand: values.brand?.trim() ? values.brand.trim() : null,
      // Omit baseUnit when locked so Nest never receives a change attempt.
      ...(options.baseUnitLocked ||
      values.baseUnit === options.currentBaseUnit
        ? {}
        : { baseUnit: values.baseUnit }),
      standardRate: values.standardRate,
      minimumStock: values.minimumStock,
      reorderLevel: values.reorderLevel,
      maximumStock: values.maximumStock,
      standardWastagePercentage: values.standardWastagePercentage,
      ledgerAccountId: values.ledgerAccountId,
      status: values.status,
    },
  };
}

export function isBaseUnitReadOnly(baseUnitLocked: boolean): boolean {
  return baseUnitLocked;
}

