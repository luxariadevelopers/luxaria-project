/**
 * Mirrors `apps/backend/src/modules/manpower-planning` shortfall / compare shapes.
 */

export const ManpowerShortfallAlertType = {
  Below80TwoConsecutiveDays: 'below_80_two_consecutive_days',
  Below60ThreeDays: 'below_60_three_days',
  MissingCriticalSkill: 'missing_critical_skill',
  WorkProgressBehindPlan: 'work_progress_behind_plan',
  NoAttendanceSubmitted: 'no_attendance_submitted',
} as const;

export type ManpowerShortfallAlertType =
  (typeof ManpowerShortfallAlertType)[keyof typeof ManpowerShortfallAlertType];

export const ManpowerEscalation = {
  SiteSupervisor: 'site_supervisor',
  ProjectManager: 'project_manager',
  CommercialAndPm: 'commercial_and_pm',
  Director: 'director',
} as const;

export type ManpowerEscalation =
  (typeof ManpowerEscalation)[keyof typeof ManpowerEscalation];

/** Nest thresholds used by shortfall evaluation (see MANPOWER_PLANNING_API.md). */
export const MANPOWER_FILL_RATE_WARNING_PERCENT = 80;
export const MANPOWER_FILL_RATE_CRITICAL_PERCENT = 60;

export const ShortfallSeverity = {
  Warning: 'warning',
  Critical: 'critical',
} as const;

export type ShortfallSeverity =
  (typeof ShortfallSeverity)[keyof typeof ShortfallSeverity];

export type PublicManpowerSkillGap = {
  skill: string;
  committedHeadcount: number;
  plannedHeadcount: number;
  actualHeadcount: number;
  isCritical: boolean;
  missing: boolean;
};

export type PublicManpowerShortfallAlert = {
  id: string;
  projectId: string;
  contractorId: string;
  agreementId: string | null;
  agreementNumber: string | null;
  asOfDate: string;
  alertType: ManpowerShortfallAlertType;
  message: string;
  shortfallPercent: number;
  consecutiveDays: number;
  agreementHeadcount: number;
  plannedHeadcount: number;
  actualHeadcount: number;
  skillGaps: PublicManpowerSkillGap[];
  expectedScheduleImpactDays: number;
  recommendedEscalation: ManpowerEscalation;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicManpowerComparison = {
  projectId: string;
  contractorId: string;
  asOfDate: string;
  agreementId: string | null;
  agreementNumber: string | null;
  agreementHeadcount: number;
  plannedHeadcount: number;
  actualHeadcount: number;
  shortfallPercent: number;
  fillRatePercent: number;
  attendanceSubmitted: boolean;
  attendanceStatus: string | null;
  skillMix: PublicManpowerSkillGap[];
  workProgress: {
    behind: boolean;
    expectedRatio: number;
    actualRatio: number;
    progressShortfallPercent: number;
    expectedScheduleImpactDays: number;
  };
};

export type ListShortfallAlertsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  contractorId?: string;
  alertType?: ManpowerShortfallAlertType;
  unacknowledgedOnly?: boolean;
};

export type EvaluateShortfallQuery = {
  asOf?: string;
  projectId?: string;
  contractorId?: string;
};

export type ListPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PaginatedShortfallAlerts = {
  items: PublicManpowerShortfallAlert[];
  meta: ListPaginationMeta | null;
};
