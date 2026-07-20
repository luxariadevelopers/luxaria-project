/** Activity completeness for site cards / feed (display only). */
export type SiteActivityStatus =
  | 'complete'
  | 'pending'
  | 'missing'
  | 'awaiting_cutoff'
  | 'unavailable';

export type SiteActivityKind =
  | 'dpr'
  | 'attendance'
  | 'grn'
  | 'stock'
  | 'petty_cash';

export type SiteActivityCardModel = {
  kind: SiteActivityKind;
  title: string;
  status: SiteActivityStatus;
  summary: string;
  detailLines: string[];
};

export type SiteFeedItem = {
  id: string;
  kind: SiteActivityKind | 'alert' | 'photo';
  title: string;
  subtitle: string;
  status?: SiteActivityStatus;
};

/** Minimal DPR row from `GET /daily-progress-reports`. */
export type SiteDprRow = {
  id: string;
  dprNumber?: string;
  status: string;
  reportDate?: string | Date;
};

/** Missing-DPR alert from `GET /daily-progress-reports/missing-alerts`. */
export type SiteMissingDprAlert = {
  id: string;
  projectId?: string;
  reportDate?: string | Date;
  acknowledged?: boolean;
};

/** GRN row from `GET /goods-receipts`. */
export type SiteGrnRow = {
  id: string;
  grnNumber?: string;
  status: string;
  receivedDate?: string | Date;
};

/** Petty-cash requirement from `GET /petty-cash-requirements`. */
export type SitePettyCashRequirement = {
  id: string;
  requirementNumber?: string;
  status: string;
  weekStartDate?: string | Date;
};

/** Daily attendance report from `GET /labour-attendance/daily-report`. */
export type SiteAttendanceReport = {
  projectId: string;
  attendanceDate: string;
  sheetCount: number;
  totalWorkers: number;
  confirmedCount: number;
  pendingConfirmationCount: number;
};
