import { z } from 'zod';
import type { CreateMaterialReconciliationInput } from './api';

export const postToBillSchema = z.object({
  billId: z.string().min(1, 'Select a running bill'),
});

export type PostToBillFormValues = z.infer<typeof postToBillSchema>;

export const materialReconciliationFormSchema = z
  .object({
    contractorId: z.string().min(1, 'Contractor is required'),
    materialId: z.string().min(1, 'Material is required'),
    workOrderId: z.string().optional().nullable(),
    periodFrom: z.string().min(1, 'Period from is required'),
    periodTo: z.string().min(1, 'Period to is required'),
    issuedQuantity: z.coerce.number().min(0, 'Must be ≥ 0'),
    theoreticalConsumption: z.coerce.number().min(0, 'Must be ≥ 0'),
    approvedWastage: z.coerce.number().min(0, 'Must be ≥ 0'),
    returnedQuantity: z.coerce.number().min(0, 'Must be ≥ 0'),
    unitRate: z.coerce.number().min(0).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
  })
  .superRefine((values, ctx) => {
    if (
      values.periodFrom &&
      values.periodTo &&
      values.periodTo < values.periodFrom
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Period to must be on or after period from',
        path: ['periodTo'],
      });
    }
  });

export type MaterialReconciliationFormValues = z.infer<
  typeof materialReconciliationFormSchema
>;

export function defaultMaterialReconciliationFormValues(): MaterialReconciliationFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    contractorId: '',
    materialId: '',
    workOrderId: '',
    periodFrom: today.slice(0, 8) + '01',
    periodTo: today,
    issuedQuantity: 0,
    theoreticalConsumption: 0,
    approvedWastage: 0,
    returnedQuantity: 0,
    unitRate: 0,
    notes: '',
  };
}

export function formValuesToCreateInput(
  values: MaterialReconciliationFormValues,
  projectId: string,
): CreateMaterialReconciliationInput {
  const wo = (values.workOrderId ?? '').trim();
  const notes = (values.notes ?? '').trim();
  return {
    projectId,
    contractorId: values.contractorId,
    materialId: values.materialId,
    workOrderId: wo || null,
    period: {
      from: values.periodFrom,
      to: values.periodTo,
    },
    issuedQuantity: values.issuedQuantity,
    theoreticalConsumption: values.theoreticalConsumption,
    approvedWastage: values.approvedWastage,
    returnedQuantity: values.returnedQuantity,
    unitRate: values.unitRate ?? 0,
    notes: notes || null,
  };
}
