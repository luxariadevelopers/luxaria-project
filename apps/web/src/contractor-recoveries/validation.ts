import { z } from 'zod';
import { moneyNonNegativeSchema } from '@/validation';
import type { CreateContractorRecoveryInput } from './api';

const recoveryTypeValues = [
  'mobilization_advance',
  'secured_advance',
  'retention',
  'security_deposit',
  'material',
  'equipment',
  'electricity_water',
  'labour_welfare',
  'damage',
  'penalty',
  'tds',
  'gst_tds',
  'manual',
] as const;

export const recoveryFormSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  contractorId: z.string().min(1, 'Contractor is required'),
  workOrderId: z.string().optional().nullable(),
  type: z.enum(recoveryTypeValues),
  amount: moneyNonNegativeSchema,
  description: z.string().max(500).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  billId: z.string().optional().nullable(),
});

export type RecoveryFormValues = z.infer<typeof recoveryFormSchema>;

export function defaultRecoveryFormValues(
  projectId: string,
): RecoveryFormValues {
  return {
    projectId,
    contractorId: '',
    workOrderId: '',
    type: 'manual',
    amount: 0,
    description: '',
    notes: '',
    billId: '',
  };
}

export function formValuesToCreateInput(
  values: RecoveryFormValues,
): CreateContractorRecoveryInput {
  return {
    projectId: values.projectId,
    contractorId: values.contractorId,
    workOrderId: values.workOrderId?.trim() || null,
    type: values.type,
    amount: values.amount,
    description: values.description?.trim() || null,
    notes: values.notes?.trim() || null,
    billId: values.billId?.trim() || null,
  };
}

export const postRecoverySchema = z.object({
  billId: z.string().optional().nullable(),
});

export type PostRecoveryFormValues = z.infer<typeof postRecoverySchema>;
