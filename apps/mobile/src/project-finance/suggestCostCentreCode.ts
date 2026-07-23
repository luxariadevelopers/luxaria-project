/**
 * Codes: `LUX-{year}-{projectShort}-{CC|PC}-{nnn}`
 * Examples: LUX-2026-MADAMB-CC-001 · LUX-2026-MADAMB-PC-001
 */

export type CentreKindToken = 'CC' | 'PC';

export function kindToken(kind?: string | null): CentreKindToken {
  return kind === 'profit_centre' ? 'PC' : 'CC';
}

export function projectShortForm(
  projectName?: string | null,
  projectCode?: string | null,
): string {
  const fromName = (projectName ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6);
  if (fromName) return fromName;

  const fromCode = (projectCode ?? '')
    .trim()
    .toUpperCase()
    .replace(/^PRJ-?/i, '')
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6);
  return fromCode || 'GEN';
}

export function costCentreCodePrefix(
  projectName?: string | null,
  projectCode?: string | null,
  kind?: string | null,
  year: number = new Date().getFullYear(),
): string {
  return `LUX-${year}-${projectShortForm(projectName, projectCode)}-${kindToken(kind)}`;
}

const SEQ_RE = /^LUX-\d{4}-[A-Z0-9]+-(?:CC|PC)-(\d+)$/i;

export function nextSequenceFromCodes(
  prefix: string,
  existingCodes: readonly string[],
): number {
  const needle = `${prefix.toUpperCase()}-`;
  let max = 0;
  for (const raw of existingCodes) {
    const code = raw.trim().toUpperCase();
    if (!code.startsWith(needle)) continue;
    const match = SEQ_RE.exec(code);
    if (!match?.[1]) continue;
    const n = Number.parseInt(match[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

export function formatCostCentreSequence(seq: number): string {
  return String(Math.max(1, seq)).padStart(3, '0');
}

export function suggestCostCentreCode(input: {
  projectName?: string | null;
  projectCode?: string | null;
  kind?: string | null;
  existingCodes?: readonly string[];
  year?: number;
  sequence?: number;
}): string {
  const prefix = costCentreCodePrefix(
    input.projectName,
    input.projectCode,
    input.kind,
    input.year ?? new Date().getFullYear(),
  );
  const seq =
    input.sequence ??
    nextSequenceFromCodes(prefix, input.existingCodes ?? []);
  return `${prefix}-${formatCostCentreSequence(seq)}`;
}
