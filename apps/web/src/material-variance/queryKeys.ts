export const MATERIAL_VARIANCE_QUERY_ROOT = ['material-variance'] as const;

export const materialVarianceKeys = {
  all: MATERIAL_VARIANCE_QUERY_ROOT,
  reports: (projectId: string | null) =>
    [...MATERIAL_VARIANCE_QUERY_ROOT, 'reports', projectId] as const,
  report: (id: string) =>
    [...MATERIAL_VARIANCE_QUERY_ROOT, 'report', id] as const,
  preview: (
    projectId: string,
    periodFrom?: string,
    periodTo?: string,
  ) =>
    [
      ...MATERIAL_VARIANCE_QUERY_ROOT,
      'preview',
      projectId,
      periodFrom ?? '',
      periodTo ?? '',
    ] as const,
};
