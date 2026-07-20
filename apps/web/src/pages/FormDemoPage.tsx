import { useCallback, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { SelectOption } from '@luxaria/shared-types';
import { useAuth } from '@/auth/AuthContext';
import {
  AsyncSelect,
  DateInput,
  DocumentPicker,
  FormSection,
  FormTextField,
  MoneyInput,
  UnsavedChangesDialog,
  applyServerFieldErrors,
  isFormEditable,
  shapeCreatePayload,
  useUnsavedChangesGuard,
} from '@/components/forms';
import { FieldErrorSummary } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { JournalStatus, journalStatusCatalog } from '@/status';
import {
  isoDateOnlySchema,
  moneyNonNegativeSchema,
} from '@/validation';

const demoFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: moneyNonNegativeSchema,
  reportDate: isoDateOnlySchema,
  vendorId: z.string().min(1, 'Vendor is required'),
  notes: z.string().optional(),
  documents: z.array(z.instanceof(File)),
});

type DemoFormValues = {
  title: string;
  amount: number;
  reportDate: string;
  vendorId: string;
  notes?: string;
  documents: File[];
};



const VENDOR_OPTIONS: SelectOption[] = [
  { value: 'v-100', label: 'Acme Steels Pvt Ltd' },
  { value: 'v-200', label: 'Coastal Cement Co' },
  { value: 'v-300', label: 'Delta Electricals' },
];

/**
 * Dev-only form pattern demo (Micro Phase 008).
 * Not linked in the sidebar — open `/dev/forms` directly.
 */
export function FormDemoPage() {
  const { hasPermission } = useAuth();
  const { success, error: notifyError } = useNotify();
  const [workflowStatus, setWorkflowStatus] = useState<string>(
    JournalStatus.Draft,
  );
  const [lastPayload, setLastPayload] = useState<string>('');

  const editable = isFormEditable({
    hasPermission: hasPermission('journal.create') || hasPermission('project.view'),
    statusAllowsEdit: journalStatusCatalog.isEditable(workflowStatus),
  });

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isDirty, isSubmitting, errors },
  } = useForm<DemoFormValues>({
    resolver: zodResolver(demoFormSchema),
    defaultValues: {
      title: '',
      amount: 0,
      reportDate: '',
      vendorId: '',
      notes: '',
      documents: [],
    },
  });


  const guard = useUnsavedChangesGuard(isDirty && editable);

  const loadVendors = useCallback(async (input: string) => {
    await new Promise((r) => setTimeout(r, 200));
    const q = input.trim().toLowerCase();
    if (!q) return VENDOR_OPTIONS;
    return VENDOR_OPTIONS.filter((o) => o.label.toLowerCase().includes(q));
  }, []);

  const disabledReason = useMemo(() => {
    if (!journalStatusCatalog.isEditable(workflowStatus)) {
      return `Record status “${journalStatusCatalog.label(workflowStatus)}” is not editable.`;

    }
    if (!hasPermission('journal.create') && !hasPermission('project.view')) {
      return 'You do not have permission to edit this form.';
    }
    return undefined;
  }, [workflowStatus, hasPermission]);

  const onSubmit = handleSubmit(async (values) => {
    const payload = shapeCreatePayload({
      title: values.title,
      amount: values.amount,
      reportDate: values.reportDate,
      vendorId: values.vendorId,
      notes: values.notes,
      // Files are uploaded via documents API separately — demo only lists names.
      documentNames: (values.documents ?? []).map((f: File) => f.name),
    });

    setLastPayload(JSON.stringify(payload, null, 2));
    // Simulate success then clear dirty state
    await new Promise((r) => setTimeout(r, 150));
    success('Demo submit OK (no API call)');
    reset(values);
  });

  const simulateServerErrors = () => {
    applyServerFieldErrors(setError, {
      title: 'Title already exists',
      amount: 'Amount must be ≥ 0',
      vendorId: 'vendorId must be a mongodb id',
    });
    notifyError('Simulated server field errors applied');
  };

  return (
    <Stack spacing={2} component="form" onSubmit={onSubmit} noValidate>
      <Typography variant="h4">Form patterns demo</Typography>
      <Typography color="text.secondary">
        Shared Zod schemas, Money/Date/AsyncSelect/DocumentPicker, permission +
        status locking, unsaved-change protection. Open{' '}
        <code>/dev/forms</code> (not in the main menu).
      </Typography>

      <FormControl size="small" sx={{ maxWidth: 280 }}>
        <InputLabel id="demo-status-label">Simulate workflow status</InputLabel>
        <Select
          labelId="demo-status-label"
          label="Simulate workflow status"
          value={workflowStatus}
          onChange={(e) => setWorkflowStatus(String(e.target.value))}
        >
          {journalStatusCatalog.values.map((status) => (
            <MenuItem key={status} value={status}>
              {journalStatusCatalog.label(status)}
              {journalStatusCatalog.isEditable(status) ? '' : ' (locked)'}

            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {!editable ? (
        <Alert severity="warning" variant="outlined">
          Form fields are disabled. {disabledReason}
        </Alert>
      ) : null}

      <FormSection
        title="Details"
        description="Client rules mirror `@luxaria/shared-validation` (money ≥ 0, YYYY-MM-DD date)."
        disabled={!editable}
        disabledReason={disabledReason}
      >
        <FormTextField
          name="title"
          control={control}
          label="Title"
          disabled={!editable}
        />
        <MoneyInput
          name="amount"
          control={control}
          label="Amount"
          disabled={!editable}
        />
        <DateInput
          name="reportDate"
          control={control}
          label="Report date"
          disabled={!editable}
        />
        <AsyncSelect
          name="vendorId"
          control={control}
          label="Vendor"
          loadOptions={loadVendors}
          disabled={!editable}
          required
        />
        <FormTextField
          name="notes"
          control={control}
          label="Notes"
          multiline
          minRows={2}
          disabled={!editable}
        />
        <DocumentPicker
          name="documents"
          control={control}
          disabled={!editable}
        />
      </FormSection>

      {Object.keys(errors).length > 0 ? (
        <FieldErrorSummary
          fieldErrors={Object.fromEntries(
            Object.entries(errors).map(([k, v]) => [
              k,
              v?.message ?? 'Invalid',
            ]),
          )}
        />
      ) : null}

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={!editable || isSubmitting}
        >
          {isSubmitting ? 'Saving…' : 'Submit'}
        </Button>
        <Button
          type="button"
          variant="outlined"
          disabled={!editable || !isDirty}
          onClick={() =>
            reset({
              title: '',
              amount: 0,
              reportDate: '',
              vendorId: '',
              notes: '',
              documents: [],
            })
          }

        >
          Reset
        </Button>
        <Button
          type="button"
          variant="outlined"
          color="warning"
          disabled={!editable}
          onClick={simulateServerErrors}
        >
          Simulate server field errors
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Dirty: {isDirty ? 'yes' : 'no'}
      </Typography>

      {lastPayload ? (
        <Alert severity="success" variant="outlined">
          <Typography variant="subtitle2">Last shaped create payload</Typography>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{lastPayload}</pre>
        </Alert>
      ) : null}

      <UnsavedChangesDialog
        open={guard.isBlocked}
        onStay={guard.reset}
        onLeave={guard.proceed}
      />
    </Stack>
  );
}
