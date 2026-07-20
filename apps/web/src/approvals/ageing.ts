/**
 * Display-only ageing. Backend has no `ageing` field — derived from
 * `stepEnteredAt` (preferred) or `requestedAt`, plus `escalated`.
 */
export type ApprovalAgeingLevel = 'fresh' | 'aging' | 'stale' | 'escalated';

export type ApprovalAgeing = {
  days: number;
  level: ApprovalAgeingLevel;
  label: string;
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function computeApprovalAgeing(input: {
  stepEnteredAt: string | Date | null | undefined;
  requestedAt: string | Date;
  escalated: boolean;
  now?: Date;
}): ApprovalAgeing {
  const now = input.now ?? new Date();
  const anchor =
    toDate(input.stepEnteredAt) ?? toDate(input.requestedAt) ?? now;
  const ms = Math.max(0, now.getTime() - anchor.getTime());
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));

  if (input.escalated) {
    return {
      days,
      level: 'escalated',
      label: days === 0 ? 'Escalated (today)' : `Escalated · ${days}d`,
    };
  }

  if (days < 1) {
    return { days, level: 'fresh', label: 'Today' };
  }
  if (days < 3) {
    return { days, level: 'aging', label: `${days}d waiting` };
  }
  return { days, level: 'stale', label: `${days}d waiting` };
}
