import { SiteExpenseAttachmentType } from './types';

/**
 * Blocks submit when the category requires a signature and none is present.
 */
export function assertSignatureReady(options: {
  requiresSignature: boolean;
  hasSignature: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (options.requiresSignature && !options.hasSignature) {
    return {
      ok: false,
      error: 'Signature is required for this expense category',
    };
  }
  return { ok: true };
}

export function hasSignatureAttachment(
  attachments: ReadonlyArray<{ type: string }> | null | undefined,
): boolean {
  return (attachments ?? []).some(
    (a) => a.type === SiteExpenseAttachmentType.Signature,
  );
}
