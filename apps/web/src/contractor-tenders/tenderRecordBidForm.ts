import { z } from 'zod';
import { BoqUnit } from '@/boq/types';
import type { RecordBidInput } from './api';

const boqUnitValues = Object.values(BoqUnit) as [string, ...string[]];

export const tenderRecordBidFormSchema = z
  .object({
    contractorId: z.string().min(1, 'Contractor is required'),
    includeTechnical: z.boolean(),
    includeCommercial: z.boolean(),
    complianceNotes: z.string().max(5000).optional().nullable(),
    technicalScore: z.coerce.number().min(0).max(100).optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    unit: z.enum(boqUnitValues).optional().nullable(),
    quantity: z.coerce.number().min(0).optional().nullable(),
    rate: z.coerce.number().min(0).optional().nullable(),
    commercialNotes: z.string().max(2000).optional().nullable(),
  })
  .superRefine((values, ctx) => {
    if (!values.includeTechnical && !values.includeCommercial) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Include a technical and/or commercial bid',
        path: ['includeTechnical'],
      });
    }
    if (values.includeCommercial) {
      if (!(values.description ?? '').trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Line description is required',
          path: ['description'],
        });
      }
      if (!values.unit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Unit is required',
          path: ['unit'],
        });
      }
      if (values.quantity == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Quantity is required',
          path: ['quantity'],
        });
      }
      if (values.rate == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Rate is required',
          path: ['rate'],
        });
      }
    }
  });

export type TenderRecordBidFormValues = z.infer<
  typeof tenderRecordBidFormSchema
>;

export function defaultTenderRecordBidFormValues(
  contractorId = '',
): TenderRecordBidFormValues {
  return {
    contractorId,
    includeTechnical: true,
    includeCommercial: false,
    complianceNotes: '',
    technicalScore: null,
    description: '',
    unit: BoqUnit.LumpSum,
    quantity: 1,
    rate: 0,
    commercialNotes: '',
  };
}

export function formValuesToRecordBidInput(
  values: TenderRecordBidFormValues,
): RecordBidInput {
  const input: RecordBidInput = {
    contractorId: values.contractorId,
  };
  if (values.includeTechnical) {
    const notes = (values.complianceNotes ?? '').trim();
    input.technical = {
      complianceNotes: notes || null,
      technicalScore: values.technicalScore ?? null,
    };
  }
  if (values.includeCommercial) {
    const notes = (values.commercialNotes ?? '').trim();
    input.commercial = {
      lines: [
        {
          description: (values.description ?? '').trim(),
          unit: values.unit!,
          quantity: values.quantity!,
          rate: values.rate!,
        },
      ],
      notes: notes || null,
    };
  }
  return input;
}
