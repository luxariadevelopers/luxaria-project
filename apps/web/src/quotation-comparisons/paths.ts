/** Absolute portal path for a PR's quotation comparison page. */
export function quotationComparisonPath(prId: string): string {
  return `/procurement/quotation-comparisons/${encodeURIComponent(prId)}`;
}
