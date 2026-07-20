import { useQuery } from '@tanstack/react-query';
import {
  fetchAttendanceDailyReport,
  fetchGoodsReceipts,
  fetchMissingDprAlerts,
  fetchPettyCashRequirements,
  fetchProjectDashboard,
  fetchSiteDprs,
} from './api';
import {
  buildMissingEntryAlerts,
  buildSiteActivityCards,
  buildTodaysActivityFeed,
} from './deriveActivityStatus';
import { isSameUtcDay, toUtcDateKey, utcTodayIsoDate } from './serverDate';

export type SiteOpsQueryArgs = {
  projectId: string | null;
  /** YYYY-MM-DD request date (UTC calendar). */
  date: string;
  canDashboard: boolean;
  canDpr: boolean;
  canAttendance: boolean;
  canGrn: boolean;
  canPetty: boolean;
};

export function siteOpsQueryKeys(args: SiteOpsQueryArgs) {
  return {
    dashboard: ['site-ops', 'dashboard', args.projectId, args.date] as const,
    dprs: ['site-ops', 'dprs', args.projectId, args.date] as const,
    missing: ['site-ops', 'missing-dpr', args.projectId] as const,
    attendance: ['site-ops', 'attendance', args.projectId, args.date] as const,
    grns: ['site-ops', 'grns', args.projectId] as const,
    petty: ['site-ops', 'petty', args.projectId] as const,
  };
}

export function useSiteOperationsDashboard(args: SiteOpsQueryArgs) {
  const enabled = Boolean(args.projectId) && args.canDashboard;
  const keys = siteOpsQueryKeys(args);
  const date = args.date || utcTodayIsoDate();

  const dashboardQuery = useQuery({
    queryKey: keys.dashboard,
    enabled,
    queryFn: () =>
      fetchProjectDashboard(args.projectId!, { date }),
  });

  const asOfKey = dashboardQuery.data
    ? toUtcDateKey(dashboardQuery.data.filters.date)
    : date;

  const dprsQuery = useQuery({
    queryKey: keys.dprs,
    enabled: enabled && args.canDpr,
    queryFn: () =>
      fetchSiteDprs({
        projectId: args.projectId!,
        fromDate: asOfKey,
        toDate: asOfKey,
      }),
  });

  const missingQuery = useQuery({
    queryKey: keys.missing,
    enabled: enabled && args.canDpr,
    queryFn: () => fetchMissingDprAlerts(args.projectId!),
  });

  const attendanceQuery = useQuery({
    queryKey: keys.attendance,
    enabled: enabled && args.canAttendance,
    queryFn: () =>
      fetchAttendanceDailyReport({
        projectId: args.projectId!,
        attendanceDate: asOfKey,
      }),
  });

  const grnsQuery = useQuery({
    queryKey: keys.grns,
    enabled: enabled && args.canGrn,
    queryFn: () => fetchGoodsReceipts({ projectId: args.projectId! }),
  });

  const pettyQuery = useQuery({
    queryKey: keys.petty,
    enabled: enabled && args.canPetty,
    queryFn: () =>
      fetchPettyCashRequirements({ projectId: args.projectId! }),
  });

  const todaysGrns = (grnsQuery.data ?? []).filter((g) =>
    g.receivedDate ? isSameUtcDay(g.receivedDate, asOfKey) : false,
  );

  const missingForDay = (missingQuery.data ?? []).filter((a) => {
    if (!a.reportDate) return true;
    return isSameUtcDay(a.reportDate, asOfKey);
  });

  const cards = buildSiteActivityCards({
    dashboard: dashboardQuery.data ?? null,
    dprsForDay: dprsQuery.data ?? [],
    missingAlertCount: missingForDay.length,
    attendance: attendanceQuery.data ?? null,
    todaysGrns,
    pettyRequirements: pettyQuery.data ?? [],
    canDpr: args.canDpr,
    canAttendance: args.canAttendance,
    canGrn: args.canGrn,
    canPetty: args.canPetty,
  });

  const missingAlerts = buildMissingEntryAlerts(
    dashboardQuery.data?.criticalAlerts ?? [],
    missingForDay,
  );

  const feed = buildTodaysActivityFeed({
    dprsForDay: dprsQuery.data ?? [],
    attendance: attendanceQuery.data ?? null,
    todaysGrns,
    sitePhotoCount: dashboardQuery.data?.sitePhotos.count ?? 0,
  });

  const loading =
    dashboardQuery.isLoading ||
    (args.canDpr && (dprsQuery.isLoading || missingQuery.isLoading)) ||
    (args.canAttendance && attendanceQuery.isLoading) ||
    (args.canGrn && grnsQuery.isLoading) ||
    (args.canPetty && pettyQuery.isLoading);

  const error =
    dashboardQuery.error ??
    dprsQuery.error ??
    missingQuery.error ??
    attendanceQuery.error ??
    grnsQuery.error ??
    pettyQuery.error;

  const refetchAll = () => {
    void dashboardQuery.refetch();
    void dprsQuery.refetch();
    void missingQuery.refetch();
    void attendanceQuery.refetch();
    void grnsQuery.refetch();
    void pettyQuery.refetch();
  };

  return {
    asOfKey,
    serverFiltersDate: dashboardQuery.data?.filters.date ?? null,
    dashboard: dashboardQuery.data ?? null,
    cards,
    missingAlerts,
    feed,
    loading,
    error,
    refetchAll,
    dashboardQuery,
  };
}
