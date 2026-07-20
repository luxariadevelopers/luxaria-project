import type { BoqVersionComparison } from './types';

export type SideBySideCompareRow = {
  key: string;
  kind: 'added' | 'removed' | 'changed';
  boqCode: string;
  description: string;
  fromValue: number | null;
  toValue: number | null;
  deltaValue: number | null;
};

/**
 * Flatten Nest compare payload into side-by-side planned-value rows.
 */
export function buildSideBySideRows(
  comparison: BoqVersionComparison,
): SideBySideCompareRow[] {
  const rows: SideBySideCompareRow[] = [];

  for (const item of comparison.added) {
    rows.push({
      key: `added:${item.boqCode}`,
      kind: 'added',
      boqCode: item.boqCode,
      description: item.description,
      fromValue: null,
      toValue: item.plannedValue,
      deltaValue: item.plannedValue,
    });
  }

  for (const item of comparison.removed) {
    rows.push({
      key: `removed:${item.boqCode}`,
      kind: 'removed',
      boqCode: item.boqCode,
      description: item.description,
      fromValue: item.plannedValue,
      toValue: null,
      deltaValue: -item.plannedValue,
    });
  }

  for (const item of comparison.changed) {
    rows.push({
      key: `changed:${item.boqCode}`,
      kind: 'changed',
      boqCode: item.boqCode,
      description: item.description,
      fromValue: item.from.plannedValue,
      toValue: item.to.plannedValue,
      deltaValue: item.deltas.plannedValue,
    });
  }

  return rows.sort((a, b) => a.boqCode.localeCompare(b.boqCode));
}

export function hasComparisonImpact(
  comparison: BoqVersionComparison,
): boolean {
  const { summary } = comparison;
  return (
    summary.addedCount > 0 ||
    summary.removedCount > 0 ||
    summary.changedCount > 0 ||
    Math.abs(summary.costImpact) > 0.005
  );
}
