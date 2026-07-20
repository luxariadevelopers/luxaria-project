import {
  ManpowerEscalation,
  ManpowerShortfallAlertType,
  ShortfallSeverity,
  type ManpowerEscalation as Escalation,
  type ManpowerShortfallAlertType as AlertType,
  type ShortfallSeverity as Severity,
} from './types';

export function shortfallAlertTypeLabel(type: AlertType | string): string {
  switch (type) {
    case ManpowerShortfallAlertType.Below80TwoConsecutiveDays:
      return 'Below 80% (2 consecutive days)';
    case ManpowerShortfallAlertType.Below60ThreeDays:
      return 'Below 60% (3 days)';
    case ManpowerShortfallAlertType.MissingCriticalSkill:
      return 'Missing critical skill';
    case ManpowerShortfallAlertType.WorkProgressBehindPlan:
      return 'Work progress behind plan';
    case ManpowerShortfallAlertType.NoAttendanceSubmitted:
      return 'No attendance submitted';
    default:
      return type;
  }
}

export function manpowerEscalationLabel(value: Escalation | string): string {
  switch (value) {
    case ManpowerEscalation.SiteSupervisor:
      return 'Site supervisor';
    case ManpowerEscalation.ProjectManager:
      return 'Project manager';
    case ManpowerEscalation.CommercialAndPm:
      return 'Commercial & PM';
    case ManpowerEscalation.Director:
      return 'Director';
    default:
      return value;
  }
}

export function shortfallSeverityLabel(severity: Severity | string): string {
  switch (severity) {
    case ShortfallSeverity.Critical:
      return 'Critical';
    case ShortfallSeverity.Warning:
      return 'Warning';
    default:
      return severity;
  }
}
