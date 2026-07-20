export const fundingDashboardKeys = {
  all: ['funding-dashboard'] as const,
  board: (projectId: string, date: string) =>
    [...fundingDashboardKeys.all, projectId, date] as const,
};
