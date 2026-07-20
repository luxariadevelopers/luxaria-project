import type {
  DprDayCompliance,
  DprIssueSeverity as DprIssueSeverityType,
} from './types';
import { DprIssueSeverity, DprStatus, DprWeather } from './types';

export function dprStatusLabel(status: string): string {
  switch (status) {
    case DprStatus.Draft:
      return 'Draft';
    case DprStatus.Submitted:
      return 'Submitted';
    case DprStatus.Reviewed:
      return 'Reviewed';
    case DprStatus.Reopened:
      return 'Reopened';
    default:
      return status;
  }
}

export const DPR_STATUS_OPTIONS = Object.values(DprStatus);

export function dprWeatherLabel(weather: string): string {
  switch (weather) {
    case DprWeather.Clear:
      return 'Clear';
    case DprWeather.Cloudy:
      return 'Cloudy';
    case DprWeather.Rain:
      return 'Rain';
    case DprWeather.Storm:
      return 'Storm';
    case DprWeather.Hot:
      return 'Hot';
    case DprWeather.Fog:
      return 'Fog';
    case DprWeather.Other:
      return 'Other';
    default:
      return weather;
  }
}

export function dprIssueSeverityLabel(
  severity: DprIssueSeverityType,
): string {
  switch (severity) {
    case DprIssueSeverity.Low:
      return 'Low';
    case DprIssueSeverity.Medium:
      return 'Medium';
    case DprIssueSeverity.High:
      return 'High';
    case DprIssueSeverity.Critical:
      return 'Critical';
    default:
      return severity;
  }
}

export function dprDayComplianceLabel(status: DprDayCompliance): string {
  switch (status) {
    case 'complete':
      return 'Submitted / reviewed';
    case 'pending':
      return 'Draft / reopened';
    case 'missing':
      return 'Missing DPR';
    case 'awaiting_cutoff':
      return 'Awaiting cut-off';
    default:
      return status;
  }
}

/** Default evening evaluation cron (`DPR_MISSING_CRON`, default 20:00 IST). */
export const DPR_MISSING_CUTOFF_NOTE =
  'Missing-DPR alerts are raised after the evening evaluation job (default 20:00). Until then, silent days show as awaiting cut-off.';
