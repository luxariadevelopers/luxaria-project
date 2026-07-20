/**
 * Mirrors `apps/backend/src/modules/daily-progress-reports` public shapes
 * (`dpr.mapper.ts` / Swagger tag Daily Progress Reports).
 *
 * Nest permissions:
 * - `dpr.view` — list/get, missing alerts
 * - `dpr.create` — create, update, submit
 * - `dpr.review` — review, reopen, regenerate PDF, evaluate alerts
 */

/** Nest `DprStatus` */
export const DprStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Reviewed: 'reviewed',
  Reopened: 'reopened',
} as const;

export type DprStatus = (typeof DprStatus)[keyof typeof DprStatus];

/** Nest `DprWeather` */
export const DprWeather = {
  Clear: 'clear',
  Cloudy: 'cloudy',
  Rain: 'rain',
  Storm: 'storm',
  Hot: 'hot',
  Fog: 'fog',
  Other: 'other',
} as const;

export type DprWeather = (typeof DprWeather)[keyof typeof DprWeather];

/** Nest `DprIssueSeverity`. */
export const DprIssueSeverity = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'critical',
} as const;

export type DprIssueSeverity =
  (typeof DprIssueSeverity)[keyof typeof DprIssueSeverity];

export type PublicDprStaffPresent = {
  id: string;
  name: string;
  role: string | null;
  present: boolean;
};

export type PublicDprBoqQuantity = {
  id: string;
  boqItemId: string;
  boqCode: string | null;
  description: string | null;
  unit: string | null;
  quantityCompleted: number;
  notes: string | null;
};

export type PublicDprMaterialLine = {
  id: string;
  materialId: string | null;
  materialName: string;
  quantity: number;
  unit: string | null;
  reference: string | null;
};

export type PublicDprEquipmentUsed = {
  id: string;
  name: string;
  hours: number;
  notes: string | null;
};

export type PublicDprDelay = {
  id: string;
  reason: string;
  hoursLost: number;
  notes: string | null;
};

export type PublicDprIssue = {
  id: string;
  description: string;
  severity: DprIssueSeverity;
  actionTaken: string | null;
};

export type PublicDprDecisionRequired = {
  id: string;
  description: string;
  owner: string | null;
  dueDate: string | null;
};

export type PublicDailyProgressReport = {
  id: string;
  dprNumber: string;
  projectId: string;
  reportDate: string;
  weather: DprWeather;
  weatherNotes: string | null;
  staffPresent: PublicDprStaffPresent[];
  labourCount: number;
  skilledLabourCount: number;
  unskilledLabourCount: number;
  workPerformed: string | null;
  boqQuantities: PublicDprBoqQuantity[];
  materialsReceived: PublicDprMaterialLine[];
  materialsIssued: PublicDprMaterialLine[];
  equipmentUsed: PublicDprEquipmentUsed[];
  delays: PublicDprDelay[];
  safetyIssues: PublicDprIssue[];
  qualityIssues: PublicDprIssue[];
  decisionsRequired: PublicDprDecisionRequired[];
  tomorrowPlan: string | null;
  photoDocumentIds: string[];
  videoDocumentIds: string[];
  siteCashBalance: number;
  siteCashAccountId: string | null;
  status: DprStatus;
  pdfDocumentId: string | null;
  clientDeviceId: string | null;
  offlineCapturedAt: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  reopenedBy: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** Nest `ReviewDailyProgressReportDto`. */
export type ReviewDprInput = {
  reviewNotes?: string | null;
};

/** Nest `ReopenDailyProgressReportDto`. */
export type ReopenDprInput = {
  reason: string;
};

export type DprDetailActionId =
  | 'review'
  | 'reopen'
  | 'regenerate_pdf';

export type PublicMissingDprAlert = {
  id: string;
  projectId: string;
  reportDate: string;
  message: string;
  acknowledged: boolean;
};

export type ListDailyProgressReportsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  status?: DprStatus | '';
  fromDate?: string;
  toDate?: string;
};

export type PaginatedDailyProgressReports = {
  items: PublicDailyProgressReport[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type DprFilterState = {
  status: '' | DprStatus;
  fromDate: string;
  toDate: string;
};

export const emptyDprFilters: DprFilterState = {
  status: '',
  fromDate: '',
  toDate: '',
};

/** Per-day compliance for missing-day indicators (evening cut-off cron). */
export type DprDayCompliance =
  | 'complete'
  | 'pending'
  | 'missing'
  | 'awaiting_cutoff';
