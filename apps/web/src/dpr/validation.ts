import type { ReopenDprInput } from './types';

const MAX_REASON_LENGTH = 2000;

export type ReopenValidationResult =
  | { ok: true; payload: ReopenDprInput }
  | { ok: false; message: string };

export function validateReopenPayload(reason: string): ReopenValidationResult {
  const trimmed = reason.trim();
  if (!trimmed) {
    return { ok: false, message: 'Reopen reason is required.' };
  }
  if (trimmed.length > MAX_REASON_LENGTH) {
    return {
      ok: false,
      message: `Reason must be at most ${MAX_REASON_LENGTH} characters.`,
    };
  }
  return { ok: true, payload: { reason: trimmed } };
}

export type ReviewValidationResult =
  | { ok: true; payload: { reviewNotes?: string | null } }
  | { ok: false; message: string };

export function validateReviewPayload(
  reviewNotes: string,
): ReviewValidationResult {
  const trimmed = reviewNotes.trim();
  if (trimmed.length > MAX_REASON_LENGTH) {
    return {
      ok: false,
      message: `Review notes must be at most ${MAX_REASON_LENGTH} characters.`,
    };
  }
  return {
    ok: true,
    payload: { reviewNotes: trimmed || null },
  };
}
