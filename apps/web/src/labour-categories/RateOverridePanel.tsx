import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { EmptyState, RetryPanel } from '@/components/errors';
import { formatDate, formatInr } from '@/format';
import { labourRateStatusLabel, rateScopeLabel } from './labels';
import { rateScopePriority, selectApplicableRate } from './resolveRateOverride';
import type { LabourCategoryCapabilities } from './roleAccess';
import {
  LabourCategoryRateStatus,
  type PublicLabourCategory,
  type PublicLabourCategoryRate,
} from './types';
import { useLabourCategoryRates } from './useLabourCategories';

type Props = {
  category: PublicLabourCategory;
  caps: LabourCategoryCapabilities;
  onAddRate: () => void;
  onEditRate: (rate: PublicLabourCategoryRate) => void;
};

/**
 * Project / contractor rate overrides with resolve-preview selection.
 */
export function RateOverridePanel({
  category,
  caps,
  onAddRate,
  onEditRate,
}: Props) {
  const ratesQuery = useLabourCategoryRates(category.id, { limit: 100 }, true);
  const [projectId, setProjectId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));

  const sortedRates = useMemo(() => {
    const items = [...(ratesQuery.data?.items ?? [])];
    items.sort((a, b) => {
      const scopeDiff = rateScopePriority(a) - rateScopePriority(b);
      if (scopeDiff !== 0) return scopeDiff;
      return b.effectiveDate.localeCompare(a.effectiveDate);
    });
    return items;
  }, [ratesQuery.data?.items]);

  const selected = useMemo(
    () =>
      selectApplicableRate({
        category,
        rates: ratesQuery.data?.items ?? [],
        projectId: projectId || null,
        contractorId: contractorId || null,
        asOf,
      }),
    [category, ratesQuery.data?.items, projectId, contractorId, asOf],
  );

  if (ratesQuery.error) {
    return (
      <RetryPanel
        error={ratesQuery.error}
        title="Could not load rate overrides"
        message={getErrorMessage(ratesQuery.error)}
        onRetry={() => void ratesQuery.refetch()}
      />
    );
  }

  if (ratesQuery.isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 3 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2} data-testid="rate-override-panel">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      >
        <Typography variant="subtitle1" sx={{ flex: 1 }}>
          Project / contractor rate overrides
        </Typography>
        {caps.canManage ? (
          <Button size="small" variant="outlined" onClick={onAddRate}>
            Add override
          </Button>
        ) : null}
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
      >
        <TextField
          size="small"
          label="Preview projectId"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value.trim())}
          sx={{ minWidth: 200 }}
          helperText="ObjectId for resolve preview"
        />
        <TextField
          size="small"
          label="Preview contractorId"
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value.trim())}
          sx={{ minWidth: 200 }}
        />
        <TextField
          size="small"
          type="date"
          label="As of"
          slotProps={{ inputLabel: { shrink: true } }}
          value={asOf}
          onChange={(e) => setAsOf(e.target.value)}
        />
      </Stack>

      <Alert severity="info" data-testid="resolved-rate-preview">
        Applicable rate: {formatInr(selected.dailyRate)} / day · OT{' '}
        {formatInr(selected.overtimeRate)} · source{' '}
        <strong>{selected.source}</strong>
        {selected.rate
          ? ` (override ${selected.rate.id.slice(-6)}, effective ${formatDate(selected.rate.effectiveDate)})`
          : ' (company defaults)'}
      </Alert>

      {sortedRates.length === 0 ? (
        <EmptyState
          title="No rate overrides"
          description="Company defaults apply until a project and/or contractor override is added."
        />
      ) : (
        <Stack spacing={1}>
          {sortedRates.map((rate) => (
            <Box
              key={rate.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
              }}
              data-testid={`rate-row-${rate.id}`}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                useFlexGap
                sx={{ alignItems: { sm: 'center' } }}
              >
                <Typography sx={{ flex: 1 }} variant="body2">
                  {rateScopeLabel(rate)} · daily {formatInr(rate.dailyRate)} ·
                  OT {formatInr(rate.overtimeRate)} · from{' '}
                  {formatDate(rate.effectiveDate)}
                </Typography>
                <Chip
                  size="small"
                  label={labourRateStatusLabel(rate.status)}
                  color={
                    rate.status === LabourCategoryRateStatus.Active
                      ? 'success'
                      : 'default'
                  }
                  variant="outlined"
                />
                {caps.canManage ? (
                  <Button size="small" onClick={() => onEditRate(rate)}>
                    Edit
                  </Button>
                ) : null}
              </Stack>
              {rate.projectId || rate.contractorId ? (
                <Typography variant="caption" color="text.secondary">
                  {rate.projectId ? `project ${rate.projectId}` : null}
                  {rate.projectId && rate.contractorId ? ' · ' : null}
                  {rate.contractorId
                    ? `contractor ${rate.contractorId}`
                    : null}
                </Typography>
              ) : null}
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
