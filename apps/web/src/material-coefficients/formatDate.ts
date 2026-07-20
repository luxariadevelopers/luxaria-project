/** Lightweight date formatter for phase 084 (no shared format package dependency). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return String(value).slice(0, 10);
}
