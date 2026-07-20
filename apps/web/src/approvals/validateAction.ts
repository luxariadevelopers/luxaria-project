export type ApprovalActionKind = 'approve' | 'reject' | 'return' | 'cancel';

export type ApprovalActionInput = {
  kind: ApprovalActionKind;
  comment: string;
};

export type ValidatedApprovalAction = {
  comment: string | null;
  fieldErrors: Partial<Record<'comment', string>>;
};

/**
 * Client rules before calling Nest action endpoints.
 * Backend `ApprovalActionDto.comment` is optional — reject/return require a
 * comment in the UI per product rules. Self-approval is enforced by Nest
 * (403); do not invent workflow `allowSelfApprove` client-side.
 */
export function validateApprovalAction(
  input: ApprovalActionInput,
): ValidatedApprovalAction {
  const trimmed = input.comment.trim();
  const fieldErrors: Partial<Record<'comment', string>> = {};

  if (
    (input.kind === 'reject' || input.kind === 'return') &&
    trimmed.length === 0
  ) {
    fieldErrors.comment = 'A comment is required for reject and return';
  }

  return {
    comment: trimmed.length > 0 ? trimmed : null,
    fieldErrors,
  };
}
