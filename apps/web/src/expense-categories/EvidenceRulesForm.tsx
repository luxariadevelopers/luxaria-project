import { Stack, Typography } from '@mui/material';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { FormCheckbox } from '@/components/forms/FormCheckbox';
import { FormTextField } from '@/components/forms/FormTextField';

type EvidenceFields = {
  requiresBill: boolean;
  requiresSignature: boolean;
  requiresPhoto: boolean;
  /** Form string; convert via `toApprovalLimit` before API call. */
  approvalLimit?: string;
};

type Props<T extends FieldValues & EvidenceFields> = {
  control: Control<T>;
  disabled?: boolean;
  showHeading?: boolean;
};

/**
 * Bill / signature / photo toggles + approval threshold.
 * Used by create/edit drawers and the dedicated evidence panel.
 */
export function EvidenceRulesForm<T extends FieldValues & EvidenceFields>({
  control,
  disabled = false,
  showHeading = true,
}: Props<T>) {
  return (
    <Stack spacing={1.5} data-testid="evidence-rules-form">
      {showHeading ? (
        <Typography variant="subtitle2">Evidence & approval rules</Typography>
      ) : null}
      <Typography variant="body2" color="text.secondary">
        Control whether a bill, photo, or signature is required, and the amount
        above which approval is needed.
      </Typography>
      <FormCheckbox
        name={'requiresBill' as Path<T>}
        control={control}
        label="Requires bill"
      />
      <FormCheckbox
        name={'requiresSignature' as Path<T>}
        control={control}
        label="Requires signature"
      />
      <FormCheckbox
        name={'requiresPhoto' as Path<T>}
        control={control}
        label="Requires photo"
      />
      <FormTextField
        name={'approvalLimit' as Path<T>}
        control={control}
        label="Approval limit"
        disabled={disabled}
        helperText="Leave blank to clear. Amounts above this limit require approval."
      />
    </Stack>
  );
}
