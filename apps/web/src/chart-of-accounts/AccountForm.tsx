import { useEffect, useMemo, useRef } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import type { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import {
  FormCheckbox,
  FormSection,
  FormSelect,
  FormTextField,
} from '@/components/forms';
import {
  ACCOUNT_CATEGORY_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
} from './labels';
import {
  defaultAllowManualPosting,
  describePostingRules,
} from './postingDefaults';
import type { PublicAccount } from './types';
import type { AccountFormValues } from './validation';

type Props = {
  mode: 'create' | 'edit';
  control: Control<AccountFormValues>;
  watch: UseFormWatch<AccountFormValues>;
  setValue: UseFormSetValue<AccountFormValues>;
  /** Parent candidates (same type; cycle-safe). */
  parentOptions: readonly PublicAccount[];
  /** Disable entire form (missing manage permission). */
  disabled?: boolean;
  disabledReason?: string;
};

export function AccountForm({
  mode,
  control,
  watch,
  setValue,
  parentOptions,
  disabled = false,
  disabledReason,
}: Props) {
  const isControl = Boolean(watch('isControlAccount'));
  const allowManual = Boolean(watch('allowManualPosting'));
  const requiresProject = Boolean(watch('requiresProject'));
  const requiresParty = Boolean(watch('requiresParty'));
  const accountType = watch('accountType');
  const typeLocked = Boolean(watch('typeLocked'));
  const parentAccountId = watch('parentAccountId');

  const prevControl = useRef(isControl);

  useEffect(() => {
    if (mode !== 'create') return;
    if (prevControl.current === isControl) return;
    prevControl.current = isControl;
    setValue('allowManualPosting', defaultAllowManualPosting(isControl), {
      shouldDirty: true,
    });
  }, [isControl, mode, setValue]);

  // Keep parentAccountType in sync for client-side type match validation.
  useEffect(() => {
    const id = parentAccountId?.trim();
    if (!id) {
      setValue('parentAccountType', null);
      return;
    }
    const parent = parentOptions.find((a) => a.id === id);
    setValue('parentAccountType', parent?.accountType ?? null);
  }, [parentAccountId, parentOptions, setValue]);

  const parentSelectOptions = useMemo(
    () => [
      { value: '', label: '— Root (no parent) —' },
      ...parentOptions
        .filter((a) => a.accountType === accountType)
        .map((a) => ({
          value: a.id,
          label: `${a.accountCode} — ${a.accountName}`,
        })),
    ],
    [parentOptions, accountType],
  );

  const postingNotes = describePostingRules({
    isControlAccount: isControl,
    allowManualPosting: allowManual,
    requiresProject,
    requiresParty,
  });

  return (
    <Stack spacing={2.5} data-testid="account-form">
      <FormSection
        title="Identity"
        description="Code is unique and stored uppercase. Type must match the parent."
        disabled={disabled}
        disabledReason={disabledReason}
      >
        {mode === 'create' ? (
          <FormTextField
            name="accountCode"
            control={control}
            label="Account code"
            required
            helperText="Alphanumeric, underscore or hyphen"
            slotProps={{
              htmlInput: { style: { textTransform: 'uppercase' } },
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Code: <strong>{watch('accountCode')}</strong> (immutable)
          </Typography>
        )}
        <FormTextField
          name="accountName"
          control={control}
          label="Account name"
          required
        />
        <FormSelect
          name="accountType"
          control={control}
          label="Account type"
          options={ACCOUNT_TYPE_OPTIONS}
          disabled={typeLocked || disabled}
        />
        <FormSelect
          name="accountCategory"
          control={control}
          label="Account category"
          options={ACCOUNT_CATEGORY_OPTIONS}
        />
        <FormSelect
          name="parentAccountId"
          control={control}
          label="Parent account"
          options={parentSelectOptions}
        />
      </FormSection>

      <FormSection
        title="Control & dimensions"
        description="Posting flags must match journal rules (allowManualPosting, requiresProject, requiresParty)."
        disabled={disabled}
      >
        <FormCheckbox
          name="isControlAccount"
          control={control}
          label="Control account (header / summary)"
        />
        <FormCheckbox
          name="allowManualPosting"
          control={control}
          label="Allow manual posting"
        />
        <FormCheckbox
          name="requiresProject"
          control={control}
          label="Requires project dimension"
        />
        <FormCheckbox
          name="requiresParty"
          control={control}
          label="Requires party dimension"
        />

        {isControl && allowManual ? (
          <Alert severity="warning" variant="outlined">
            Control accounts usually block manual posting. Enabling
            allowManualPosting is allowed but uncommon.
          </Alert>
        ) : null}

        <Alert severity="info" variant="outlined">
          <Stack component="ul" sx={{ m: 0, pl: 2 }}>
            {postingNotes.map((note) => (
              <Typography component="li" key={note} variant="body2">
                {note}
              </Typography>
            ))}
          </Stack>
        </Alert>
      </FormSection>
    </Stack>
  );
}
