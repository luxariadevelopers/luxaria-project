import type { ProjectCriticalAlert, ProjectDashboardSummary } from '@/director-command-centre/projectDashboardTypes';
import type {
  SiteActivityCardModel,
  SiteActivityStatus,
  SiteAttendanceReport,
  SiteDprRow,
  SiteFeedItem,
  SiteGrnRow,
  SiteMissingDprAlert,
  SitePettyCashRequirement,
} from './types';

const DPR_COMPLETE = new Set(['submitted', 'reviewed']);
const DPR_PENDING = new Set(['draft', 'reopened']);

/**
 * DPR missing alerts are raised by evening evaluation (`DPR_MISSING_CRON`,
 * default 20:00). Until an alert exists, a silent day is “awaiting cut-off”
 * rather than confirmed missing.
 */
export function deriveDprStatus(input: {
  dprsForDay: readonly SiteDprRow[];
  missingAlertCount: number;
}): SiteActivityStatus {
  if (input.missingAlertCount > 0) {
    return 'missing';
  }
  if (input.dprsForDay.some((d) => DPR_COMPLETE.has(d.status))) {
    return 'complete';
  }
  if (input.dprsForDay.some((d) => DPR_PENDING.has(d.status))) {
    return 'pending';
  }
  if (input.dprsForDay.length === 0) {
    return 'awaiting_cutoff';
  }
  return 'pending';
}

export function deriveAttendanceStatus(
  report: SiteAttendanceReport | null,
  dashboardLabour: ProjectDashboardSummary['labourAttendance'] | null,
): SiteActivityStatus {
  if (report) {
    if (report.confirmedCount > 0 && report.pendingConfirmationCount === 0) {
      return 'complete';
    }
    if (report.sheetCount === 0) {
      return 'missing';
    }
    if (report.pendingConfirmationCount > 0 || report.sheetCount > 0) {
      return 'pending';
    }
  }
  if (dashboardLabour) {
    if (
      dashboardLabour.confirmedSheets > 0 &&
      dashboardLabour.submittedSheets === 0
    ) {
      return 'complete';
    }
    if (dashboardLabour.sheetCount === 0) {
      return 'missing';
    }
    return 'pending';
  }
  return 'unavailable';
}

export function deriveGrnStatus(todaysGrns: readonly SiteGrnRow[]): SiteActivityStatus {
  if (todaysGrns.length === 0) {
    return 'missing';
  }
  const open = todaysGrns.filter(
    (g) => g.status !== 'posted' && g.status !== 'cancelled',
  );
  if (open.length === 0) {
    return 'complete';
  }
  return 'pending';
}

export function deriveStockStatus(
  dashboard: ProjectDashboardSummary | null,
): SiteActivityStatus {
  if (!dashboard) return 'unavailable';
  const stockAlert = dashboard.criticalAlerts.find(
    (a) => a.code === 'MATERIAL_STOCK',
  );
  if (stockAlert && stockAlert.count > 0) {
    return 'pending';
  }
  if (dashboard.materialStock.materialCount === 0) {
    return 'missing';
  }
  return 'complete';
}

/** Open workflow statuses for petty-cash requirements (backend enum values). */
const PETTY_OPEN = new Set([
  'draft',
  'submitted',
  'project_manager_review',
  'finance_review',
  'returned',
  'approved',
]);

export function derivePettyCashStatus(
  dashboard: ProjectDashboardSummary | null,
  requirements: readonly SitePettyCashRequirement[],
): SiteActivityStatus {
  if (!dashboard && requirements.length === 0) {
    return 'unavailable';
  }
  const openReqs = requirements.filter((r) => PETTY_OPEN.has(r.status));
  if (openReqs.length > 0) {
    return 'pending';
  }
  if (dashboard && dashboard.cashBalance.amount > 0) {
    return 'complete';
  }
  if (requirements.length === 0 && dashboard) {
    return 'missing';
  }
  return 'complete';
}

export function buildSiteActivityCards(input: {
  dashboard: ProjectDashboardSummary | null;
  dprsForDay: readonly SiteDprRow[];
  missingAlertCount: number;
  attendance: SiteAttendanceReport | null;
  todaysGrns: readonly SiteGrnRow[];
  pettyRequirements: readonly SitePettyCashRequirement[];
  canDpr: boolean;
  canAttendance: boolean;
  canGrn: boolean;
  canPetty: boolean;
}): SiteActivityCardModel[] {
  const dprStatus = input.canDpr
    ? deriveDprStatus({
        dprsForDay: input.dprsForDay,
        missingAlertCount: input.missingAlertCount,
      })
    : 'unavailable';

  const attendanceStatus = input.canAttendance
    ? deriveAttendanceStatus(
        input.attendance,
        input.dashboard?.labourAttendance ?? null,
      )
    : 'unavailable';

  const grnStatus = input.canGrn
    ? deriveGrnStatus(input.todaysGrns)
    : 'unavailable';

  const stockStatus = deriveStockStatus(input.dashboard);

  const pettyStatus = input.canPetty
    ? derivePettyCashStatus(input.dashboard, input.pettyRequirements)
    : input.dashboard
      ? derivePettyCashStatus(input.dashboard, [])
      : 'unavailable';

  const labour = input.dashboard?.labourAttendance;
  const stock = input.dashboard?.materialStock;

  return [
    {
      kind: 'dpr',
      title: 'Daily progress report',
      status: dprStatus,
      summary: statusLabel(dprStatus),
      detailLines: [
        input.dprsForDay.length
          ? `${input.dprsForDay.length} record(s) for as-of day`
          : 'No DPR for as-of day',
        input.missingAlertCount > 0
          ? `${input.missingAlertCount} missing-DPR alert(s)`
          : 'No open missing-DPR alerts',
      ],
    },
    {
      kind: 'attendance',
      title: 'Labour attendance',
      status: attendanceStatus,
      summary: statusLabel(attendanceStatus),
      detailLines: [
        labour
          ? `${labour.totalWorkers} workers · ${labour.confirmedSheets} confirmed / ${labour.submittedSheets} submitted`
          : input.attendance
            ? `${input.attendance.totalWorkers} workers · ${input.attendance.confirmedCount} confirmed`
            : 'No attendance summary',
      ],
    },
    {
      kind: 'grn',
      title: 'Goods receipts',
      status: grnStatus,
      summary: statusLabel(grnStatus),
      detailLines: [
        input.todaysGrns.length
          ? `${input.todaysGrns.length} GRN(s) on as-of day`
          : 'No GRNs on as-of day',
      ],
    },
    {
      kind: 'stock',
      title: 'Material stock',
      status: stockStatus,
      summary: statusLabel(stockStatus),
      detailLines: [
        stock
          ? `${stock.materialCount} materials · qty ${stock.totalQuantity} · ${stock.locations} locations`
          : 'Stock summary unavailable',
      ],
    },
    {
      kind: 'petty_cash',
      title: 'Petty cash / site cash',
      status: pettyStatus,
      summary: statusLabel(pettyStatus),
      detailLines: [
        input.dashboard
          ? `Cash balance ${input.dashboard.cashBalance.amount}`
          : 'Cash balance unavailable',
        input.pettyRequirements.length
          ? `${input.pettyRequirements.length} requirement(s) listed`
          : 'No petty-cash requirements loaded',
      ],
    },
  ];
}

export function buildMissingEntryAlerts(
  alerts: readonly ProjectCriticalAlert[],
  missingDpr: readonly SiteMissingDprAlert[],
): SiteFeedItem[] {
  const siteCodes = new Set([
    'MISSING_DPR',
    'MATERIAL_STOCK',
    'LABOUR_SHORTFALL',
  ]);
  const fromDashboard = alerts
    .filter((a) => siteCodes.has(a.code))
    .map((a) => ({
      id: `alert:${a.code}`,
      kind: 'alert' as const,
      title: a.message,
      subtitle: `${a.severity} · count ${a.count}`,
      status:
        a.code === 'MISSING_DPR'
          ? ('missing' as const)
          : ('pending' as const),
    }));

  const fromMissing = missingDpr.map((a) => ({
    id: `missing-dpr:${a.id}`,
    kind: 'alert' as const,
    title: 'Missing daily progress report',
    subtitle: a.reportDate
      ? `Report date ${String(a.reportDate).slice(0, 10)}`
      : 'Unacknowledged missing-DPR alert',
    status: 'missing' as const,
  }));

  // Prefer dashboard roll-up; append detailed missing alerts when present.
  const seen = new Set(fromDashboard.map((i) => i.id));
  return [
    ...fromDashboard,
    ...fromMissing.filter((i) => !seen.has(i.id)),
  ];
}

export function buildTodaysActivityFeed(input: {
  dprsForDay: readonly SiteDprRow[];
  attendance: SiteAttendanceReport | null;
  todaysGrns: readonly SiteGrnRow[];
  sitePhotoCount: number;
}): SiteFeedItem[] {
  const items: SiteFeedItem[] = [];

  for (const dpr of input.dprsForDay) {
    items.push({
      id: `dpr:${dpr.id}`,
      kind: 'dpr',
      title: dpr.dprNumber ?? 'Daily progress report',
      subtitle: `Status ${dpr.status}`,
      status: DPR_COMPLETE.has(dpr.status)
        ? 'complete'
        : DPR_PENDING.has(dpr.status)
          ? 'pending'
          : 'pending',
    });
  }

  if (input.attendance && input.attendance.sheetCount > 0) {
    items.push({
      id: `attendance:${input.attendance.attendanceDate}`,
      kind: 'attendance',
      title: 'Labour attendance',
      subtitle: `${input.attendance.sheetCount} sheet(s) · ${input.attendance.totalWorkers} workers`,
      status: deriveAttendanceStatus(input.attendance, null),
    });
  }

  for (const grn of input.todaysGrns) {
    items.push({
      id: `grn:${grn.id}`,
      kind: 'grn',
      title: grn.grnNumber ?? 'Goods receipt',
      subtitle: `Status ${grn.status}`,
      status:
        grn.status === 'posted'
          ? 'complete'
          : grn.status === 'cancelled'
            ? 'complete'
            : 'pending',
    });
  }

  if (input.sitePhotoCount > 0) {
    items.push({
      id: 'photos',
      kind: 'photo',
      title: 'Site photos',
      subtitle: `${input.sitePhotoCount} recent photo(s) in project dashboard`,
      status: 'complete',
    });
  }

  return items;
}

export function statusLabel(status: SiteActivityStatus): string {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'pending':
      return 'Pending';
    case 'missing':
      return 'Missing';
    case 'awaiting_cutoff':
      return 'Awaiting cut-off';
    case 'unavailable':
      return 'Unavailable';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
