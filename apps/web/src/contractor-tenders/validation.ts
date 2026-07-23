import { z } from 'zod';
import type {
  CreateContractorTenderInput,
  InviteContractorsInput,
} from './api';

export const tenderCreateFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(240),
  description: z.string().max(5000).optional().nullable(),
  bidDeadline: z.string().optional().nullable(),
});

export type TenderCreateFormValues = z.infer<typeof tenderCreateFormSchema>;

export function defaultTenderCreateFormValues(): TenderCreateFormValues {
  return {
    title: '',
    description: '',
    bidDeadline: '',
  };
}

export function formValuesToCreateInput(
  values: TenderCreateFormValues,
  projectId: string,
): CreateContractorTenderInput {
  const deadline = (values.bidDeadline ?? '').trim();
  const description = (values.description ?? '').trim();
  return {
    projectId,
    title: values.title.trim(),
    description: description || null,
    bidDeadline: deadline
      ? new Date(`${deadline}T23:59:59.000Z`).toISOString()
      : null,
  };
}

export const tenderInviteFormSchema = z.object({
  contractorIds: z
    .array(z.string().min(1))
    .min(1, 'Select at least one contractor'),
  bidDeadline: z.string().optional().nullable(),
});

export type TenderInviteFormValues = z.infer<typeof tenderInviteFormSchema>;

export function formValuesToInviteInput(
  values: TenderInviteFormValues,
): InviteContractorsInput {
  const deadline = (values.bidDeadline ?? '').trim();
  return {
    contractorIds: values.contractorIds,
    bidDeadline: deadline
      ? new Date(`${deadline}T23:59:59.000Z`).toISOString()
      : null,
  };
}
