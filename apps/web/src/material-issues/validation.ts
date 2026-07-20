import { z } from 'zod';
import { MaterialUnit } from './types';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const SHA256_RE = /^[a-f0-9]{64}$/i;

/**
 * Client-side available-stock guard (mirrors Nest `assertAvailableStock`).
 * Prevents issuing above on-hand quantity in base units.
 * Server remains authoritative on submit/confirm.
 */
export function assertIssueWithinAvailableStock(input: {
  materialLabel: string;
  requestedBaseQuantity: number;
  availableBaseQuantity: number;
}): { ok: true } | { ok: false; message: string } {
  if (
    !Number.isFinite(input.requestedBaseQuantity) ||
    input.requestedBaseQuantity <= 0
  ) {
    return { ok: false, message: 'quantity must be greater than 0' };
  }
  if (!Number.isFinite(input.availableBaseQuantity)) {
    return { ok: false, message: 'Available stock is unknown' };
  }
  if (input.requestedBaseQuantity - input.availableBaseQuantity > 1e-9) {
    return {
      ok: false,
      message: `Insufficient stock for ${input.materialLabel}: available ${input.availableBaseQuantity}, requested ${input.requestedBaseQuantity}`,
    };
  }
  return { ok: true };
}

/**
 * Client-side return quantity guard (mirrors Nest `assertReturnWithinIssued`
 * + positive quantity DTO `@Min(0.000001)`).
 */
export function assertPositiveReturnQuantity(input: {
  materialLabel: string;
  returnQuantity: number;
  remainingBaseQuantity: number;
}): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(input.returnQuantity) || input.returnQuantity <= 0) {
    return { ok: false, message: 'Return quantity must be greater than 0' };
  }
  if (input.returnQuantity - input.remainingBaseQuantity > 1e-9) {
    return {
      ok: false,
      message: `Return quantity exceeds remaining issued stock for ${input.materialLabel} (remaining ${input.remainingBaseQuantity})`,
    };
  }
  return { ok: true };
}

const issueItemSchema = z.object({
  materialId: z
    .string()
    .min(1, 'Material is required')
    .regex(OBJECT_ID_RE, 'materialId must be a valid ObjectId'),
  quantity: z.coerce.number().min(0.000001, 'Quantity must be greater than 0'),
  unit: z.enum([
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
  ]),
  batch: z.string().max(80).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  /** Optional client stock check (base units). */
  availableBaseQuantity: z.coerce.number().optional(),
  materialLabel: z.string().optional(),
});

export const issueCreateSchema = z
  .object({
    projectId: z
      .string()
      .min(1, 'Project is required')
      .regex(OBJECT_ID_RE, 'projectId must be a valid ObjectId'),
    issueDate: z.string().min(1, 'Issue date is required'),
    receivedBy: z
      .string()
      .min(1, 'Receiver is required')
      .regex(OBJECT_ID_RE, 'receivedBy must be a valid ObjectId'),
    contractorId: z
      .union([
        z.literal(''),
        z.string().regex(OBJECT_ID_RE, 'Invalid contractor id'),
      ])
      .optional(),
    blockId: z
      .union([
        z.literal(''),
        z.string().regex(OBJECT_ID_RE, 'Invalid block id'),
      ])
      .optional(),
    floorId: z.string().max(40).optional().nullable(),
    boqItemId: z
      .string()
      .min(1, 'BOQ item is required')
      .regex(OBJECT_ID_RE, 'boqItemId must be a valid ObjectId'),
    workLocation: z
      .string()
      .trim()
      .min(1, 'Work location is required')
      .max(240),
    storeLocation: z.string().max(120).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    items: z.array(issueItemSchema).min(1, 'At least one item is required'),
  })
  .superRefine((values, ctx) => {
    values.items.forEach((item, index) => {
      if (item.availableBaseQuantity == null) return;
      const check = assertIssueWithinAvailableStock({
        materialLabel: item.materialLabel || item.materialId,
        requestedBaseQuantity: item.quantity,
        availableBaseQuantity: item.availableBaseQuantity,
      });
      if (!check.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: check.message,
          path: ['items', index, 'quantity'],
        });
      }
    });
  });

export type IssueCreateFormValues = z.infer<typeof issueCreateSchema>;

export const attachSignaturesSchema = z.object({
  recipientSignatureDocumentId: z
    .string()
    .regex(OBJECT_ID_RE, 'Recipient signature document id is required'),
  recipientSignatureChecksum: z
    .string()
    .regex(SHA256_RE, 'recipientSignatureChecksum must be a 64-char hex SHA-256'),
  issuerSignatureDocumentId: z
    .union([
      z.literal(''),
      z.string().regex(OBJECT_ID_RE, 'Invalid issuer signature document id'),
    ])
    .optional(),
  issuerSignatureChecksum: z
    .union([
      z.literal(''),
      z
        .string()
        .regex(
          SHA256_RE,
          'issuerSignatureChecksum must be a 64-char hex SHA-256',
        ),
    ])
    .optional(),
});

export type AttachSignaturesFormValues = z.infer<typeof attachSignaturesSchema>;

const returnItemSchema = z.object({
  materialId: z
    .string()
    .min(1)
    .regex(OBJECT_ID_RE, 'materialId must be a valid ObjectId'),
  quantity: z.coerce.number().min(0.000001, 'Return quantity must be > 0'),
  unit: z.enum([
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
  ]),
  reason: z.string().max(500).optional().nullable(),
  remainingBaseQuantity: z.coerce.number().optional(),
  materialLabel: z.string().optional(),
});

export const materialReturnSchema = z
  .object({
    returnDate: z.string().min(1, 'Return date is required'),
    notes: z.string().max(2000).optional().nullable(),
    items: z.array(returnItemSchema).min(1, 'At least one return line'),
  })
  .superRefine((values, ctx) => {
    values.items.forEach((item, index) => {
      const check = assertPositiveReturnQuantity({
        materialLabel: item.materialLabel || item.materialId,
        returnQuantity: item.quantity,
        remainingBaseQuantity: item.remainingBaseQuantity ?? Infinity,
      });
      if (!check.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: check.message,
          path: ['items', index, 'quantity'],
        });
      }
    });
  });

export type MaterialReturnFormValues = z.infer<typeof materialReturnSchema>;
