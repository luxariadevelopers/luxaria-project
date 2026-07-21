import { useMemo, useState } from 'react';
import {
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/api/errors';
import { searchContractors } from '@/api/searchLists';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityDetailLayout,
  SummaryCards,
} from '@/components/entity-detail';
import { formatDate } from '@/format';
import { ScheduleImpactPanel } from '@/manpower-shortfall/ScheduleImpactPanel';
import {
  manpowerPlanSourceLabel,
  manpowerPlansListPath,
  PlanFormDrawer,
  resolveManpowerPlanCapabilities,
  useManpowerPlanDetail,
} from '@/manpower-plans';

/**
 * Manpower plan detail — `/contractors/manpower-plans/:planId`.
 *
 * Nest: `GET/PATCH /manpower-planning/plans/:id` (+ compare via shortfall module).
 * Permissions: `manpower_plan.view` / `manpower_plan.manage`.
 */
export function ManpowerPlanDetailPage() {
  const { planId = '' } = useParams<{ planId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveManpowerPlanCapabilities(hasPermission);
  const [editOpen, setEditOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const detailQuery = useManpowerPlanDetail(planId || undefined, canView);
  const plan = detailQuery.data;

  const contractors = useQuery({
    queryKey: ['manpower-plans', 'contractors', plan?.projectId],
    queryFn: () =>
      searchContractors({
        search: '',
        limit: 100,
        projectId: plan?.projectId,
      }),
    enabled: Boolean(plan?.projectId),
    staleTime: 60_000,
    retry: false,
  });

  const contractorOptions = useMemo(
    () =>
      (contractors.data ?? []).map((row) => ({
        id: row.id,
        label: `${row.contractorCode} · ${row.legalName}`,
      })),
    [contractors.data],
  );

  const contractorLabel = useMemo(() => {
    const map = new Map(contractorOptions.map((row) => [row.id, row.label]));
    return plan ? map.get(plan.contractorId) ?? plan.contractorId : '';
  }, [contractorOptions, plan]);

  const summaryFields = useMemo(() => {
    if (!plan) return [];
    return [
      { id: 'date', label: 'Plan date', value: formatDate(plan.planDate) },
      { id: 'contractor', label: 'Contractor', value: contractorLabel },
      {
        id: 'headcount',
        label: 'Planned headcount',
        value: String(plan.plannedHeadcount),
      },
      {
        id: 'source',
        label: 'Source',
        value: manpowerPlanSourceLabel(plan.source),
      },
      { id: 'skills', label: 'Skill lines', value: String(plan.skillMix.length) },
      { id: 'notes', label: 'Notes', value: plan.notes?.trim() || '—' },
    ];
  }, [contractorLabel, plan]);

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={
          Boolean(planId) &&
          !detailQuery.isLoading &&
          !plan &&
          !detailQuery.error
        }
        permissionTitle="Manpower plan unavailable"
        permissionMessage="You need the manpower_plan.view permission to open a daily manpower plan."
        notFoundTitle="Manpower plan not found"
        notFoundDescription="This plan may have been removed or belongs to another project."
        header={
          plan ? (
            <DetailHeader
              title="Daily manpower plan"
              code={plan.planNumber}
              subtitle={formatDate(plan.planDate)}
              backTo={manpowerPlansListPath()}
              backLabel="Back to plans"
              meta={
                <Chip
                  size="small"
                  label={manpowerPlanSourceLabel(plan.source)}
                  variant="outlined"
                />
              }
            />
          ) : null
        }
        summary={plan ? <SummaryCards fields={summaryFields} /> : null}
        actionBar={
          plan && caps.canManage ? (
            <Stack direction="row" spacing={1}>
              <Chip
                clickable
                color="primary"
                label="Edit plan"
                onClick={() => setEditOpen(true)}
                data-testid="edit-manpower-plan"
              />
            </Stack>
          ) : null
        }
      >
        {plan ? (
          <Stack spacing={3} data-testid="manpower-plan-detail">
            <Stack spacing={1}>
              <Typography variant="subtitle1">Skill mix</Typography>
              {plan.skillMix.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No skill lines on this plan.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Skill</TableCell>
                      <TableCell align="right">Planned</TableCell>
                      <TableCell>Critical</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {plan.skillMix.map((line) => (
                      <TableRow key={line.id || line.skill}>
                        <TableCell>{line.skill}</TableCell>
                        <TableCell align="right">
                          {line.plannedHeadcount}
                        </TableCell>
                        <TableCell>{line.isCritical ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Stack>

            <ScheduleImpactPanel
              projectId={plan.projectId}
              contractorId={plan.contractorId}
              asOfDate={plan.planDate.slice(0, 10)}
              enabled={caps.canView}
            />
          </Stack>
        ) : null}
      </EntityDetailLayout>

      {plan && caps.canManage ? (
        <PlanFormDrawer
          open={editOpen}
          onClose={() => setEditOpen(false)}
          projectId={plan.projectId}
          contractors={contractorOptions}
          plan={plan}
        />
      ) : null}

      {contractors.error ? (
        <Typography variant="caption" color="error">
          {getErrorMessage(contractors.error)}
        </Typography>
      ) : null}
    </>
  );
}
