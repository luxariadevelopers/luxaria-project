import {
  ManpowerShortfallAlertType,
  ShortfallSeverity,
  type ManpowerShortfallAlertType as AlertType,
  type ShortfallSeverity as Severity,
} from './types';

/**
 * Maps Nest alert types (configured 80% / 60% thresholds) to UI severity.
 * Critical: fill &lt; 60% streak or missing critical skill.
 * Warning: fill &lt; 80% streak, no attendance, or progress behind plan.
 */
export function shortfallSeverity(alertType: AlertType | string): Severity {
  switch (alertType) {
    case ManpowerShortfallAlertType.Below60ThreeDays:
    case ManpowerShortfallAlertType.MissingCriticalSkill:
      return ShortfallSeverity.Critical;
    case ManpowerShortfallAlertType.Below80TwoConsecutiveDays:
    case ManpowerShortfallAlertType.NoAttendanceSubmitted:
    case ManpowerShortfallAlertType.WorkProgressBehindPlan:
      return ShortfallSeverity.Warning;
    default:
      return ShortfallSeverity.Warning;
  }
}

export function shortfallSeverityRank(severity: Severity): number {
  return severity === ShortfallSeverity.Critical ? 2 : 1;
}

export function compareShortfallBySeverity(
  a: { alertType: string },
  b: { alertType: string },
): number {
  return (
    shortfallSeverityRank(shortfallSeverity(b.alertType)) -
    shortfallSeverityRank(shortfallSeverity(a.alertType))
  );
}
