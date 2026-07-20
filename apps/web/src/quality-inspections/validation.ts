import { z } from 'zod';
import { QualityInspectionResult } from './types';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

/**
 * Mirrors Nest `assertLineDecision` for client preview.
 * Server remains authoritative.
 */
export function assertLineDecision(input: {
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string | null;
}): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(input.acceptedQuantity) || input.acceptedQuantity < 0) {
    return { ok: false, message: 'acceptedQuantity must be ≥ 0' };
  }
  if (!Number.isFinite(input.rejectedQuantity) || input.rejectedQuantity < 0) {
    return { ok: false, message: 'rejectedQuantity must be ≥ 0' };
  }
  const sum = input.acceptedQuantity + input.rejectedQuantity;
  if (Math.abs(sum - input.receivedQuantity) > 1e-6) {
    return {
      ok: false,
      message: `acceptedQuantity + rejectedQuantity (${sum}) must equal receivedQuantity (${input.receivedQuantity})`,
    };
  }
  if (input.rejectedQuantity > 0) {
    const reason = input.rejectionReason?.trim() || '';
    if (reason.length < 3) {
      return {
        ok: false,
        message: 'rejectionReason is required when rejectedQuantity > 0',
      };
    }
  }
  return { ok: true };
}

/**
 * Mirrors Nest `assertResultMatchesLines` for accepted / partial / rejected.
 */
export function assertResultMatchesLines(input: {
  result: string;
  items: Array<{ acceptedQuantity: number; rejectedQuantity: number }>;
}): { ok: true } | { ok: false; message: string } {
  if (input.result === QualityInspectionResult.Hold) {
    return { ok: true };
  }
  if (!input.items.length) {
    return {
      ok: false,
      message: 'Inspection line decisions are required for this result',
    };
  }

  const anyAccepted = input.items.some((i) => i.acceptedQuantity > 0);
  const anyRejected = input.items.some((i) => i.rejectedQuantity > 0);

  if (input.result === QualityInspectionResult.Accepted) {
    if (anyRejected) {
      return {
        ok: false,
        message:
          'Accepted result cannot include rejected quantities; use partially_accepted',
      };
    }
    if (!anyAccepted) {
      return {
        ok: false,
        message: 'Accepted result requires acceptedQuantity > 0',
      };
    }
  }

  if (input.result === QualityInspectionResult.PartiallyAccepted) {
    if (!anyAccepted || !anyRejected) {
      return {
        ok: false,
        message:
          'Partially accepted requires both accepted and rejected quantities',
      };
    }
  }

  if (input.result === QualityInspectionResult.Rejected) {
    if (anyAccepted) {
      return {
        ok: false,
        message:
          'Rejected result cannot include accepted quantities; use partially_accepted',
      };
    }
    if (!anyRejected) {
      return {
        ok: false,
        message: 'Rejected result requires rejectedQuantity > 0',
      };
    }
  }

  return { ok: true };
}

export const inspectionCreateSchema = z.object({
  grnId: z
    .string()
    .min(1, 'GRN is required')
    .regex(OBJECT_ID_RE, 'GRN id must be a valid ObjectId'),
  inspectionDate: z.string().min(1, 'Inspection date is required'),
  remarks: z.string().optional(),
});

export type InspectionCreateFormValues = z.infer<typeof inspectionCreateSchema>;

export const testParameterSchema = z.object({
  name: z.string().min(1, 'Parameter name is required').max(200),
  expectedValue: z.string().max(200).optional().nullable(),
  actualValue: z.string().max(200).optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  passed: z.boolean().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type TestParameterFormValues = z.infer<typeof testParameterSchema>;

export const inspectionLineDecisionSchema = z.object({
  grnLineId: z.string().regex(OBJECT_ID_RE, 'Invalid GRN line id'),
  receivedQuantity: z.coerce.number().min(0),
  acceptedQuantity: z.coerce.number().min(0),
  rejectedQuantity: z.coerce.number().min(0),
  rejectionReason: z.string().optional().nullable(),
});

export type InspectionLineDecisionFormValues = z.infer<
  typeof inspectionLineDecisionSchema
>;

export const completeInspectionSchema = z
  .object({
    result: z.enum([
      QualityInspectionResult.Accepted,
      QualityInspectionResult.PartiallyAccepted,
      QualityInspectionResult.Rejected,
      QualityInspectionResult.Hold,
    ]),
    remarks: z.string().max(2000).optional().nullable(),
    items: z.array(inspectionLineDecisionSchema).default([]),
    testParameters: z.array(testParameterSchema).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.result === QualityInspectionResult.Hold) {
      return;
    }

    if (!values.items.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Line decisions are required for this result',
        path: ['items'],
      });
      return;
    }

    for (let i = 0; i < values.items.length; i += 1) {
      const line = values.items[i]!;
      const check = assertLineDecision(line);
      if (!check.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: check.message,
          path: ['items', i],
        });
      }
    }

    const match = assertResultMatchesLines({
      result: values.result,
      items: values.items,
    });
    if (!match.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: match.message,
        path: ['result'],
      });
    }
  });

export type CompleteInspectionFormValues = z.infer<
  typeof completeInspectionSchema
>;

/** Prefill lines for Accepted (full accept) / Rejected (full reject). */
export function buildDefaultLineDecisions(
  items: ReadonlyArray<{
    grnLineId: string;
    receivedQuantity: number;
    acceptedQuantity?: number | null;
    rejectedQuantity?: number | null;
    rejectionReason?: string | null;
  }>,
  result: string,
): InspectionLineDecisionFormValues[] {
  return items.map((item) => {
    if (result === QualityInspectionResult.Accepted) {
      return {
        grnLineId: item.grnLineId,
        receivedQuantity: item.receivedQuantity,
        acceptedQuantity: item.receivedQuantity,
        rejectedQuantity: 0,
        rejectionReason: null,
      };
    }
    if (result === QualityInspectionResult.Rejected) {
      return {
        grnLineId: item.grnLineId,
        receivedQuantity: item.receivedQuantity,
        acceptedQuantity: 0,
        rejectedQuantity: item.receivedQuantity,
        rejectionReason: item.rejectionReason?.trim() || '',
      };
    }
    if (result === QualityInspectionResult.PartiallyAccepted) {
      const accepted =
        item.acceptedQuantity != null
          ? item.acceptedQuantity
          : Math.floor(item.receivedQuantity / 2);
      const rejected = Math.max(0, item.receivedQuantity - accepted);
      return {
        grnLineId: item.grnLineId,
        receivedQuantity: item.receivedQuantity,
        acceptedQuantity: accepted,
        rejectedQuantity: rejected,
        rejectionReason:
          rejected > 0 ? item.rejectionReason?.trim() || '' : null,
      };
    }
    return {
      grnLineId: item.grnLineId,
      receivedQuantity: item.receivedQuantity,
      acceptedQuantity: item.acceptedQuantity ?? 0,
      rejectedQuantity: item.rejectedQuantity ?? 0,
      rejectionReason: item.rejectionReason,
    };
  });
}
