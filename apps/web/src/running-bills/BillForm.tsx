import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CalculationGrid } from './CalculationGrid';
import { DeductionsPanel, type DeductionField } from './DeductionsPanel';
import { MeasurementSelector } from './MeasurementSelector';
import type {
  ContractorAgreementOption,
  ContractorOption,
  EligibleWorkMeasurement,
} from './types';
import {
  buildCalculationLines,
  computeAdvanceRecovery,
  computeBillAmounts,
  computeRetentionAmount,
  findDuplicateMeasurementIds,
  measurementIdsAlreadyOnOpenBills,
  netPayableReconciles,
  sumCurrentCertifiedValue,
  type RunningBillFormValues,
} from './validation';

type Props = {
  values: RunningBillFormValues;
  onChange: (next: RunningBillFormValues) => void;
  contractors: readonly ContractorOption[];
  agreements: readonly ContractorAgreementOption[];
  measurements: readonly EligibleWorkMeasurement[];
  billedIds?: ReadonlySet<string>;
  measurementsLoading?: boolean;
  agreementsLoading?: boolean;
  busy?: boolean;
  formError?: string | null;
  onSaveDraft: () => void;
  onSaveAndSubmit: () => void;
  canSubmit: boolean;
};

function numOrEmpty(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return String(value);
}

function parseOptionalNumber(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function BillForm({
  values,
  onChange,
  contractors,
  agreements,
  measurements,
  billedIds,
  measurementsLoading,
  agreementsLoading,
  busy,
  formError,
  onSaveDraft,
  onSaveAndSubmit,
  canSubmit,
}: Props) {
  const [deductionDraft, setDeductionDraft] = useState({
    advanceRecovery: numOrEmpty(values.advanceRecovery),
    materialRecovery: numOrEmpty(values.materialRecovery ?? 0),
    retention: numOrEmpty(values.retention),
    tds: numOrEmpty(values.tds ?? 0),
    penalty: numOrEmpty(values.penalty ?? 0),
    otherDeductions: numOrEmpty(values.otherDeductions ?? 0),
  });

  const selectedAgreement = useMemo(
    () => agreements.find((a) => a.id === values.agreementId) ?? null,
    [agreements, values.agreementId],
  );

  const calcLines = useMemo(
    () =>
      buildCalculationLines(
        measurements,
        values.measurementIds,
        selectedAgreement?.boqItems ?? [],
      ),
    [measurements, values.measurementIds, selectedAgreement],
  );

  const currentCertifiedValue = sumCurrentCertifiedValue(calcLines);

  const defaultRetention = selectedAgreement
    ? computeRetentionAmount(
        currentCertifiedValue,
        selectedAgreement.retentionPercentage,
      )
    : 0;

  const defaultAdvance = selectedAgreement
    ? computeAdvanceRecovery({
        currentCertifiedValue,
        advanceAmount: selectedAgreement.advance.amount,
        alreadyRecovered: 0,
        percentPerBill: selectedAgreement.recoveryPlan.percentPerBill,
        overrideAmount:
          values.advanceRecovery != null ? values.advanceRecovery : null,
      })
    : 0;

  const amounts = computeBillAmounts({
    currentCertifiedValue,
    advanceRecovery: values.advanceRecovery ?? defaultAdvance,
    materialRecovery: values.materialRecovery ?? 0,
    retention: values.retention ?? defaultRetention,
    tds: values.tds ?? 0,
    penalty: values.penalty ?? 0,
    otherDeductions: values.otherDeductions ?? 0,
  });

  useEffect(() => {
    setDeductionDraft({
      advanceRecovery: numOrEmpty(values.advanceRecovery ?? defaultAdvance),
      materialRecovery: numOrEmpty(values.materialRecovery ?? 0),
      retention: numOrEmpty(values.retention ?? defaultRetention),
      tds: numOrEmpty(values.tds ?? 0),
      penalty: numOrEmpty(values.penalty ?? 0),
      otherDeductions: numOrEmpty(values.otherDeductions ?? 0),
    });
  }, [
    values.advanceRecovery,
    values.materialRecovery,
    values.retention,
    values.tds,
    values.penalty,
    values.otherDeductions,
    defaultAdvance,
    defaultRetention,
  ]);

  const duplicateIds = findDuplicateMeasurementIds(values.measurementIds);
  const alreadyBilled = billedIds
    ? measurementIdsAlreadyOnOpenBills(values.measurementIds, billedIds)
    : [];
  const reconciled = netPayableReconciles(amounts);

  const patchDeduction = (field: DeductionField, raw: string) => {
    setDeductionDraft((prev) => ({ ...prev, [field]: raw }));
    const parsed = parseOptionalNumber(raw);
    onChange({
      ...values,
      [field]: parsed ?? (field === 'advanceRecovery' || field === 'retention'
        ? undefined
        : 0),
    });
  };

  return (
    <Stack spacing={2.5} data-testid="running-bill-form">
      {formError ? <Alert severity="error">{formError}</Alert> : null}
      {duplicateIds.length > 0 ? (
        <Alert severity="error">
          Duplicate measurement claim is not allowed.
        </Alert>
      ) : null}
      {alreadyBilled.length > 0 ? (
        <Alert severity="error">
          One or more selected measurements are already on an open running bill.
        </Alert>
      ) : null}
      {!reconciled ? (
        <Alert severity="error">
          Net payable does not reconcile with certified value minus deductions.
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
      >
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel id="rb-contractor">Contractor</InputLabel>
          <Select
            labelId="rb-contractor"
            label="Contractor"
            value={values.contractorId}
            onChange={(e) =>
              onChange({
                ...values,
                contractorId: e.target.value,
                agreementId: '',
                measurementIds: [],
              })
            }
            data-testid="rb-contractor"
          >
            <MenuItem value="">Select contractor</MenuItem>
            {contractors.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {[c.contractorCode, c.legalName].filter(Boolean).join(' — ')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="rb-agreement">Agreement</InputLabel>
          <Select
            labelId="rb-agreement"
            label="Agreement"
            value={values.agreementId}
            disabled={!values.contractorId || agreementsLoading}
            onChange={(e) =>
              onChange({
                ...values,
                agreementId: e.target.value,
                measurementIds: [],
              })
            }
            data-testid="rb-agreement"
          >
            <MenuItem value="">Select active agreement</MenuItem>
            {agreements.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.agreementNumber} · v{a.version}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="date"
          label="Period from"
          value={values.billingPeriodFrom}
          onChange={(e) =>
            onChange({
              ...values,
              billingPeriodFrom: e.target.value,
              measurementIds: [],
            })
          }
          slotProps={{ inputLabel: { shrink: true } }}
          data-testid="rb-period-from"
        />
        <TextField
          size="small"
          type="date"
          label="Period to"
          value={values.billingPeriodTo}
          onChange={(e) =>
            onChange({
              ...values,
              billingPeriodTo: e.target.value,
              measurementIds: [],
            })
          }
          slotProps={{ inputLabel: { shrink: true } }}
          data-testid="rb-period-to"
        />
      </Stack>

      <MeasurementSelector
        measurements={measurements}
        selectedIds={values.measurementIds}
        billedIds={billedIds}
        loading={measurementsLoading}
        disabled={!values.agreementId}
        onChange={(ids) => onChange({ ...values, measurementIds: ids })}
        errorMessage={
          duplicateIds.length > 0
            ? 'Duplicate measurement claim is not allowed'
            : null
        }
      />

      <CalculationGrid lines={calcLines} />

      <DeductionsPanel
        amounts={amounts}
        advanceRecovery={deductionDraft.advanceRecovery}
        materialRecovery={deductionDraft.materialRecovery}
        retention={deductionDraft.retention}
        tds={deductionDraft.tds}
        penalty={deductionDraft.penalty}
        otherDeductions={deductionDraft.otherDeductions}
        onChange={patchDeduction}
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
      >
        <TextField
          size="small"
          label="Invoice document id"
          value={values.invoiceDocument ?? ''}
          onChange={(e) =>
            onChange({ ...values, invoiceDocument: e.target.value })
          }
          sx={{ minWidth: 260 }}
          helperText="Required before submit-claim"
          data-testid="rb-invoice-document"
        />
        <TextField
          size="small"
          label="Notes"
          value={values.notes ?? ''}
          onChange={(e) => onChange({ ...values, notes: e.target.value })}
          sx={{ minWidth: 260, flex: 1 }}
          data-testid="rb-notes"
        />
      </Stack>

      <Stack direction="row" spacing={1.5}>
        <Button
          variant="outlined"
          disabled={busy}
          onClick={onSaveDraft}
          data-testid="rb-save-draft"
        >
          Save draft
        </Button>
        <Button
          variant="contained"
          disabled={busy || !canSubmit || !reconciled || alreadyBilled.length > 0}
          onClick={onSaveAndSubmit}
          data-testid="rb-save-submit"
        >
          Save & submit claim
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Nest recalculates rates, retention defaults, and advance recovery on
        create/update. Client preview must reconcile before submit.
      </Typography>
    </Stack>
  );
}
