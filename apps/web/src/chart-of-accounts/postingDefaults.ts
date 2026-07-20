/**
 * Mirrors Nest create defaults in `ChartOfAccountsService.create`:
 * `allowManualPosting ?? (isControl ? false : true)`.
 */
export function defaultAllowManualPosting(isControlAccount: boolean): boolean {
  return isControlAccount ? false : true;
}

export type PostingRulePreview = {
  allowManualPosting: boolean;
  requiresProject: boolean;
  requiresParty: boolean;
  isControlAccount: boolean;
};

/**
 * Client-side preview of journal posting constraints (server remains authoritative).
 * Matches `assertAllowsManualPosting` + `assertRequiredDimensions` intent.
 */
export function describePostingRules(flags: PostingRulePreview): string[] {
  const notes: string[] = [];
  if (!flags.allowManualPosting) {
    notes.push(
      'Manual journal lines are blocked until allowManualPosting is enabled.',
    );
  }
  if (flags.isControlAccount && !flags.allowManualPosting) {
    notes.push(
      'Control accounts reject manual postings unless allowManualPosting is true.',
    );
  }
  if (flags.requiresProject) {
    notes.push('Journal lines must include a project dimension.');
  }
  if (flags.requiresParty) {
    notes.push('Journal lines must include a party dimension.');
  }
  if (notes.length === 0) {
    notes.push(
      'Manual posting allowed without project or party dimensions.',
    );
  }
  return notes;
}
