/**
 * Mirrors `apps/backend/src/modules/daily-progress-reports` public shapes
 * (`dpr.mapper.ts` / Swagger tag Daily Progress Reports).
 *
 * Nest permissions:
 * - `dpr.view` — list/get, missing alerts
 * - `dpr.create` — create, update, submit
 * - `dpr.review` — verify, approve, lock, review (legacy), reopen, regenerate PDF
 */

/** Nest `DprStatus` */
export const DprStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Verified: 'verified',
  /** Legacy alias for approved — treat as approved-like in UI. */
  Reviewed: 'reviewed',
  Approved: 'approved',
  Locked: 'locked',
  Reopened: 'reopened',
} as const;

export type DprStatus = (typeof DprStatus)[keyof typeof DprStatus];

/** Nest `DprShift` */
export const DprShift = {
  Morning: 'morning',
  Afternoon: 'afternoon',
  Night: 'night',
  General: 'general',
} as const;

export type DprShift = (typeof DprShift)[keyof typeof DprShift];

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
  siteId: string | null;
  zoneSiteId: string | null;
  blockSiteId: string | null;
  towerSiteId: string | null;
  floorSiteId: string | null;
  unitId: string | null;
  locationSiteIds: string[];
  reportDate: string;
  shift: DprShift;
  weather: DprWeather;
  weatherNotes: string | null;
  staffPresent: PublicDprStaffPresent[];
  labourCount: number;
  skilledLabourCount: number;
  unskilledLabourCount: number;
  workPerformed: string | null;
  plannedWork: string | null;
  delayedWork: string | null;
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
  materialIssueIds: string[];
  stockReservationIds: string[];
  labourAttendanceIds: string[];
  workMeasurementIds: string[];
  equipmentUtilizationIds: string[];
  diaryEntryIds: string[];
  qualityObservationIds: string[];
  safetyIncidentIds: string[];
  siteIssueIds: string[];
  drawingIds: string[];
  siteCashBalance: number;
  siteCashAccountId: string | null;
  status: DprStatus;
  pdfDocumentId: string | null;
  clientDeviceId: string | null;
  offlineCapturedAt: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verifyNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  approveNotes: string | null;
  lockedBy: string | null;
  lockedAt: string | null;
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
  | 'verify'
  | 'approve'
  | 'lock'
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
  siteId?: string;
  shift?: DprShift | '';
  status?: DprStatus | '';
  fromDate?: string;
  toDate?: string;
};

export type VerifyDprInput = {
  verifyNotes?: string | null;
};

export type ApproveDprInput = {
  approveNotes?: string | null;
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
