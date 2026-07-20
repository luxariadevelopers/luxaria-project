export const purchaseDashboardKeys = {
  all: ['purchase-dashboard'] as const,
  pipeline: (projectId: string, date: string) =>
    [...purchaseDashboardKeys.all, 'pipeline', projectId, date] as const,
  pendingPrs: (projectId: string) =>
    [...purchaseDashboardKeys.all, 'pending-prs', projectId] as const,
  openPos: (projectId: string) =>
    [...purchaseDashboardKeys.all, 'open-pos', projectId] as const,
  exceptions: (projectId: string) =>
    [...purchaseDashboardKeys.all, 'exceptions', projectId] as const,
  paymentDue: (projectId: string) =>
    [...purchaseDashboardKeys.all, 'payment-due', projectId] as const,
};
