import { describe, expect, it } from 'vitest';
import {
  compareShortfallBySeverity,
  shortfallSeverity,
} from './shortfallSeverity';
import {
  ManpowerShortfallAlertType,
  ShortfallSeverity,
} from './types';

describe('shortfallSeverity (Phase 092)', () => {
  it('maps Nest threshold alerts to warning / critical', () => {
    expect(
      shortfallSeverity(
        ManpowerShortfallAlertType.Below80TwoConsecutiveDays,
      ),
    ).toBe(ShortfallSeverity.Warning);
    expect(
      shortfallSeverity(ManpowerShortfallAlertType.NoAttendanceSubmitted),
    ).toBe(ShortfallSeverity.Warning);
    expect(
      shortfallSeverity(ManpowerShortfallAlertType.WorkProgressBehindPlan),
    ).toBe(ShortfallSeverity.Warning);
    expect(
      shortfallSeverity(ManpowerShortfallAlertType.Below60ThreeDays),
    ).toBe(ShortfallSeverity.Critical);
    expect(
      shortfallSeverity(ManpowerShortfallAlertType.MissingCriticalSkill),
    ).toBe(ShortfallSeverity.Critical);
  });

  it('sorts critical alerts before warning', () => {
    const rows = [
      { alertType: ManpowerShortfallAlertType.Below80TwoConsecutiveDays },
      { alertType: ManpowerShortfallAlertType.Below60ThreeDays },
    ];
    rows.sort(compareShortfallBySeverity);
    expect(rows[0]?.alertType).toBe(
      ManpowerShortfallAlertType.Below60ThreeDays,
    );
  });
});
