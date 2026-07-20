import { z } from 'zod';
import { ContributionType } from './types';

/**
 * Mirrors Nest `assertCommitmentNotBelowReceived` for client preview.
 * Server remains authoritative.
 */
export function assertCommitmentNotBelowReceived(
  commitmentAmount: number,
  receivedAmount: number,
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(commitmentAmount) || commitmentAmount < 0) {
    return {
      ok: false,
      message: 'Commitment amount must be a non-negative number.',
    };
  }
  if (commitmentAmount < receivedAmount) {
    return {
      ok: false,
      message: `Commitment amount (${commitmentAmount}) cannot be less than already received (${receivedAmount}).`,
    };
  }
  return { ok: true };
}

/**
 * Create form — contribution type (Nest instrument classification) and
 * commitment/due dates required in UI; Nest defaults commitmentDate if omitted.
 */
export const commitmentCreateSchema = z.object({
  participantId: z.string().min(1, 'Participant is required'),
  commitmentAmount: z.coerce.number().min(0, 'Amount must be ≥ 0'),
  commitmentDate: z.string().min(1, 'Commitment date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  contributionType: z.enum([
    ContributionType.Capital,
    ContributionType.Equity,
    ContributionType.Loan,
    ContributionType.JointVenture,
    ContributionType.Other,
  ]),
  agreementReference: z.string().optional(),
  remarks: z.string().optional(),
});

export type CommitmentCreateFormValues = z.infer<typeof commitmentCreateSchema>;

export const commitmentAmendSchema = z
  .object({
    commitmentAmount: z.coerce.number().min(0, 'Amount must be ≥ 0'),
    dueDate: z.string().optional(),
    contributionType: z.enum([
      ContributionType.Capital,
      ContributionType.Equity,
      ContributionType.Loan,
      ContributionType.JointVenture,
      ContributionType.Other,
    ]),
    remarks: z.string().min(1, 'Amendment remarks are required'),
    receivedAmount: z.coerce.number().min(0),
  })
  .superRefine((values, ctx) => {
    const check = assertCommitmentNotBelowReceived(
      values.commitmentAmount,
      values.receivedAmount,
    );
    if (!check.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: check.message,
        path: ['commitmentAmount'],
      });
    }
  });

export type CommitmentAmendFormValues = z.infer<typeof commitmentAmendSchema>;

export const commitmentCancelSchema = z.object({
  cancellationReason: z.string().min(1, 'Cancellation reason is required'),
});

export type CommitmentCancelFormValues = z.infer<typeof commitmentCancelSchema>;
