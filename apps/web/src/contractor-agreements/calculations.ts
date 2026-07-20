/** Mirrors Nest `contractor-agreements.validation` for client preview. */

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function assertDateRange(
  startDate: string,
  endDate: string,
): { ok: true } | { ok: false; message: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: 'Invalid startDate or endDate' };
  }
  if (start.getTime() > end.getTime()) {
    return { ok: false, message: 'startDate cannot be after endDate' };
  }
  return { ok: true };
}

export function assertRetentionPercentage(
  value: number,
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return {
      ok: false,
      message: 'retentionPercentage must be between 0 and 100',
    };
  }
  return { ok: true };
}

export function assertManpower(
  value: number,
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, message: 'manpowerCommitment must be ≥ 0' };
  }
  return { ok: true };
}

export function normalizeSkillMix(
  entries?: Array<{ skill: string; headcount: number }> | null,
): { ok: true; value: Array<{ skill: string; headcount: number }> } | {
  ok: false;
  message: string;
} {
  if (!entries?.length) {
    return { ok: true, value: [] };
  }
  const out: Array<{ skill: string; headcount: number }> = [];
  for (const entry of entries) {
    const skill = entry.skill?.trim();
    if (!skill) {
      return { ok: false, message: 'skillMix.skill is required' };
    }
    if (!Number.isFinite(entry.headcount) || entry.headcount < 0) {
      return { ok: false, message: 'skillMix.headcount must be ≥ 0' };
    }
    out.push({ skill, headcount: entry.headcount });
  }
  return { ok: true, value: out };
}

export function computeBoqLineValue(
  agreedQuantity: number,
  agreedRate: number,
): { ok: true; value: number } | { ok: false; message: string } {
  if (!Number.isFinite(agreedQuantity) || agreedQuantity < 0) {
    return { ok: false, message: 'boqItems.agreedQuantity must be ≥ 0' };
  }
  if (!Number.isFinite(agreedRate) || agreedRate < 0) {
    return { ok: false, message: 'boqItems.agreedRate must be ≥ 0' };
  }
  return { ok: true, value: roundMoney(agreedQuantity * agreedRate) };
}

export function summarizeBoqItems(
  items: Array<{ agreedQuantity: number; agreedRate: number }>,
): { agreedQuantity: number; agreedRatesTotal: number } {
  let agreedQuantity = 0;
  let agreedRatesTotal = 0;
  for (const item of items) {
    const line = computeBoqLineValue(item.agreedQuantity, item.agreedRate);
    if (!line.ok) continue;
    agreedQuantity = roundQty(agreedQuantity + item.agreedQuantity);
    agreedRatesTotal = roundMoney(agreedRatesTotal + line.value);
  }
  return { agreedQuantity, agreedRatesTotal };
}

export function daysUntil(endDate: string, asOf = new Date()): number {
  const end = new Date(endDate);
  const endUtc = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  const startUtc = Date.UTC(
    asOf.getUTCFullYear(),
    asOf.getUTCMonth(),
    asOf.getUTCDate(),
  );
  return Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000));
}

export function resolveExpiryAlertType(input: {
  daysRemaining: number;
  warningDays: number;
}): 'expiring_soon' | 'expiring_critical' | 'expired' | null {
  if (input.daysRemaining < 0) return 'expired';
  if (input.daysRemaining <= 7) return 'expiring_critical';
  if (input.daysRemaining <= input.warningDays) return 'expiring_soon';
  return null;
}
