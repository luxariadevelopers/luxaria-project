import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveMaterialConsumptionReport,
  cancelMaterialConsumptionReport,
  fetchMaterialConsumptionReport,
  generateMaterialConsumptionReport,
  listMaterialConsumptionReports,
  previewMaterialConsumption,
  submitMaterialConsumptionReport,
  updateMaterialConsumptionReport,
} from './api';
import { materialVarianceKeys } from './queryKeys';
import type {
  ApproveMaterialConsumptionReportInput,
  GenerateMaterialConsumptionReportInput,
  PreviewMaterialConsumptionQuery,
  UpdateMaterialConsumptionReportInput,
} from './types';

export function useMaterialConsumptionReports(
  projectId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: materialVarianceKeys.reports(projectId),
    queryFn: () =>
      listMaterialConsumptionReports({
        projectId: projectId ?? undefined,
        limit: 50,
      }),
    enabled: enabled && Boolean(projectId),
  });
}

export function useMaterialConsumptionReport(id: string | null, enabled = true) {
  return useQuery({
    queryKey: materialVarianceKeys.report(id ?? ''),
    queryFn: () => fetchMaterialConsumptionReport(id!),
    enabled: enabled && Boolean(id),
  });
}

export function useMaterialConsumptionPreview(
  query: PreviewMaterialConsumptionQuery | null,
  enabled = true,
) {
  return useQuery({
    queryKey: materialVarianceKeys.preview(
      query?.projectId ?? '',
      query?.periodFrom,
      query?.periodTo,
    ),
    queryFn: () => previewMaterialConsumption(query!),
    enabled: enabled && Boolean(query?.projectId),
  });
}

export function useMaterialVarianceMutations(projectId: string | null) {
  const queryClient = useQueryClient();

  const invalidate = async (reportId?: string) => {
    await queryClient.invalidateQueries({
      queryKey: materialVarianceKeys.reports(projectId),
    });
    if (reportId) {
      await queryClient.invalidateQueries({
        queryKey: materialVarianceKeys.report(reportId),
      });
    }
  };

  const generate = useMutation({
    mutationFn: (input: GenerateMaterialConsumptionReportInput) =>
      generateMaterialConsumptionReport(input),
    onSuccess: (data) => void invalidate(data.id),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateMaterialConsumptionReportInput;
    }) => updateMaterialConsumptionReport(id, input),
    onSuccess: (data) => void invalidate(data.id),
  });

  const submit = useMutation({
    mutationFn: (id: string) => submitMaterialConsumptionReport(id),
    onSuccess: (data) => void invalidate(data.id),
  });

  const approve = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input?: ApproveMaterialConsumptionReportInput;
    }) => approveMaterialConsumptionReport(id, input),
    onSuccess: (data) => void invalidate(data.id),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelMaterialConsumptionReport(id),
    onSuccess: (data) => void invalidate(data.id),
  });

  return { generate, update, submit, approve, cancel };
}
