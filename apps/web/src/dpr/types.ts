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

export type PublicDailyProgressReport = {
  id: string;
  dprNumber: string;
  projectId: string;
  reportDate: string;
  weather: DprWeather | string;
  weatherNotes: string | null;
  labourCount: number;
  skilledLabourCount: number;
  unskilledLabourCount: number;
  workPerformed: string | null;
  photoDocumentIds: string[];
  videoDocumentIds: string[];
  siteCashBalance: number;
  status: DprStatus | string;
  pdfDocumentId: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

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
