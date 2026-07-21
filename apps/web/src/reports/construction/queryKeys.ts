import type {
  ConstructionReportQuery,
  ConstructionReportType,
} from './types';

export const constructionReportsKeys = {
  all: ['construction-reports'] as const,
  catalogue: () => [...constructionReportsKeys.all, 'catalogue'] as const,
  report: (reportType: ConstructionReportType, query: ConstructionReportQuery) =>
    [...constructionReportsKeys.all, 'report', reportType, query] as const,
};
