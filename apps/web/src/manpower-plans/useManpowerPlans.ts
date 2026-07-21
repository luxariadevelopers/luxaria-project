import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createManpowerPlan,
  fetchManpowerPlan,
  fetchManpowerPlans,
  updateManpowerPlan,
} from './api';
import { manpowerPlanKeys } from './queryKeys';
import type {
  CreateManpowerDailyPlanInput,
  ListManpowerPlansQuery,
  UpdateManpowerDailyPlanInput,
} from './types';

export function useManpowerPlansList(
  query: ListManpowerPlansQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: manpowerPlanKeys.list(query),
    queryFn: () => fetchManpowerPlans(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useManpowerPlanDetail(planId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: manpowerPlanKeys.detail(planId ?? ''),
    queryFn: () => fetchManpowerPlan(planId!),
    enabled: Boolean(planId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useInvalidateManpowerPlans() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: manpowerPlanKeys.all });
  };
}

export function useCreateManpowerPlan() {
  const invalidate = useInvalidateManpowerPlans();
  return useMutation({
    mutationFn: (input: CreateManpowerDailyPlanInput) =>
      createManpowerPlan(input),
    onSuccess: invalidate,
  });
}

export function useUpdateManpowerPlan() {
  const invalidate = useInvalidateManpowerPlans();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateManpowerDailyPlanInput;
    }) => updateManpowerPlan(id, input),
    onSuccess: invalidate,
  });
}
