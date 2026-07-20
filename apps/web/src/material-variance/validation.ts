import type { MaterialConsumptionLine } from './types';

/** Default from Nest `MATERIAL_CONSUMPTION_VARIANCE_THRESHOLD_PERCENT`. */
export const DEFAULT_VARIANCE_THRESHOLD_PERCENT = 5;

export type ValidationIssue = {
  lineId?: string;
  field: 'explanation' | 'approvalComment' | 'evidence';
  message: string;
};

export type SubmitValidationResult =
  | { ok: true }
  | { ok: false; issues: ValidationIssue[] };

export type ApproveValidationResult =
  | { ok: true }
  | { ok: false; issues: ValidationIssue[] };

/** Lines that must carry an explanation before submit (Nest submit gate). */
export function linesRequiringExplanation(
  lines: readonly MaterialConsumptionLine[],
): MaterialConsumptionLine[] {
  return lines.filter((line) => line.requiresApproval);
}

/**
 * Client-side submit validation aligned with Nest
 * `assertVarianceExplained` — every `requiresApproval` line needs explanation.
 */
export function validateSubmitExplanations(input: {
  lines: readonly MaterialConsumptionLine[];
  explanations: Readonly<Record<string, string>>;
  requireEvidenceWhenAboveThreshold?: boolean;
  thresholdPercent?: number;
  evidenceByLine?: Readonly<Record<string, File[]>>;
}): SubmitValidationResult {
  const issues: ValidationIssue[] = [];
  const threshold = input.thresholdPercent ?? DEFAULT_VARIANCE_THRESHOLD_PERCENT;

  for (const line of linesRequiringExplanation(input.lines)) {
    const explanation = input.explanations[line.id]?.trim() ?? '';
    if (!explanation) {
      issues.push({
        lineId: line.id,
        field: 'explanation',
        message: `Explanation required for ${lineLabel(line)} before submit`,
      });
    }

    const aboveThreshold =
      Math.abs(line.varianceQuantity) > 1e-9 &&
      line.variancePercentage >= threshold - 1e-9;

    if (
      input.requireEvidenceWhenAboveThreshold &&
      aboveThreshold &&
      !(input.evidenceByLine?.[line.id]?.length ?? 0)
    ) {
      issues.push({
        lineId: line.id,
        field: 'evidence',
        message: `Supporting evidence required for ${lineLabel(line)} (variance ≥ ${threshold}%)`,
      });
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true };
}

/**
 * Client-side approve validation aligned with Nest
 * `assertVarianceApprovalComment` when report requires approval.
 */
export function validateApproveComment(input: {
  requiresApproval: boolean;
  approvalComment?: string | null;
}): ApproveValidationResult {
  if (!input.requiresApproval) {
    return { ok: true };
  }
  if (!input.approvalComment?.trim()) {
    return {
      ok: false,
      issues: [
        {
          field: 'approvalComment',
          message:
            'Approval comment is required when the report has variance lines needing approval',
        },
      ],
    };
  }
  return { ok: true };
}

/** Whether a line should show the explanation editor. */
export function lineNeedsExplanationEditor(
  line: MaterialConsumptionLine,
): boolean {
  return line.requiresApproval;
}

function lineLabel(line: MaterialConsumptionLine): string {
  const boq = line.boqCode ?? 'BOQ';
  const mat = line.materialName ?? line.materialCode ?? 'Material';
  return `${boq} · ${mat}`;
}
