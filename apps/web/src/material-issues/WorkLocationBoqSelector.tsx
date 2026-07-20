import { useState } from 'react';
import { Stack, TextField, Typography } from '@mui/material';
import type { Control } from 'react-hook-form';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { EmptyState, RetryPanel } from '@/components/errors';
import type { IssueCreateFormValues } from './validation';
import { useBoqItemsForIssue } from './useMaterialIssues';

type Props = {
  control: Control<IssueCreateFormValues>;
  projectId: string | null | undefined;
  canViewBoq: boolean;
};

/**
 * BOQ item + free-text work location (Nest requires both on create).
 */
export function WorkLocationBoqSelector({
  control,
  projectId,
  canViewBoq,
}: Props) {
  const [search, setSearch] = useState('');
  const boqQuery = useBoqItemsForIssue(projectId, search, canViewBoq);

  if (!canViewBoq) {
    return (
      <Stack spacing={2} data-testid="work-location-boq-selector">
        <FormTextField
          name="boqItemId"
          control={control}
          label="BOQ item id"
          required
          helperText="Need boq.view to browse BOQ items; paste ObjectId if known."
        />
        <FormTextField
          name="workLocation"
          control={control}
          label="Work location"
          required
          helperText="e.g. Block A – Column casting"
        />
      </Stack>
    );
  }

  const options = (boqQuery.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.boqCode} · ${item.description}`,
  }));

  return (
    <Stack spacing={2} data-testid="work-location-boq-selector">
      <FormTextField
        name="workLocation"
        control={control}
        label="Work location"
        required
        helperText="Site work location linked to this issue"
      />

      <TextField
        size="small"
        label="Search BOQ"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        inputProps={{ 'data-testid': 'boq-search' }}
      />

      {boqQuery.error ? (
        <RetryPanel
          error={boqQuery.error}
          onRetry={() => void boqQuery.refetch()}
          forceRetry
        />
      ) : null}

      {!boqQuery.isLoading && !boqQuery.error && options.length === 0 ? (
        <EmptyState
          title="No BOQ items"
          description="Add BOQ items for this project, or refine the search."
        />
      ) : (
        <FormSelect
          name="boqItemId"
          control={control}
          label="BOQ item"
          options={options}
        />
      )}

      {boqQuery.isLoading ? (
        <Typography variant="caption" color="text.secondary">
          Loading BOQ items…
        </Typography>
      ) : null}
    </Stack>
  );
}
