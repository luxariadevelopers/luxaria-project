import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { InspectionLinesGrid } from './InspectionLinesGrid';
import {
  qualityInspectionResultLabel,
} from './labels';
import {
  fromParameterGridRows,
  ParameterGrid,
  toParameterGridRows,
  type ParameterGridRow,
} from './ParameterGrid';
import {
  QualityInspectionResult,
  type PublicQualityInspection,
} from './types';
import { useCompleteQualityInspection } from './useQualityInspections';
import {
  buildDefaultLineDecisions,
  completeInspectionSchema,
  type InspectionLineDecisionFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  inspection: PublicQualityInspection | null;
  onCompleted?: () => void;
};

const RESULT_OPTIONS = Object.values(QualityInspectionResult);

/**
 * Record inspection result (`POST …/complete`).
 * Enforces result-specific quantities and rejection reasons client-side.
 */
export function ResultActions({
  open,
  onClose,
  inspection,
  onCompleted,
}: Props) {
  const complete = useCompleteQualityInspection();
  const { success, error: notifyError } = useNotify();

  const [result, setResult] = useState<string>(
    QualityInspectionResult.Accepted,
  );
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState<InspectionLineDecisionFormValues[]>([]);
  const [parameters, setParameters] = useState<ParameterGridRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !inspection) return;
    const nextResult = QualityInspectionResult.Accepted;
    setResult(nextResult);
    setRemarks(inspection.remarks ?? '');
    setParameters(toParameterGridRows(inspection.testParameters));
    setItems(buildDefaultLineDecisions(inspection.items, nextResult));
    setFormError(null);
  }, [open, inspection]);

  useEffect(() => {
    if (!inspection || !open) return;
    if (result === QualityInspectionResult.Hold) {
      setItems([]);
      return;
    }
    setItems(buildDefaultLineDecisions(inspection.items, result));
  }, [result, inspection, open]);

  const materialLabel = useMemo(() => {
    const map = new Map(
      (inspection?.items ?? []).map((line) => [
        line.grnLineId,
        [line.materialCode, line.materialName].filter(Boolean).join(' · ') ||
          line.grnLineId,
      ]),
    );
    return (grnLineId: string) => map.get(grnLineId) ?? grnLineId;
  }, [inspection]);

  const onSubmit = async () => {
    if (!inspection) return;
    const parsed = completeInspectionSchema.safeParse({
      result,
      remarks: remarks.trim() || null,
      items: result === QualityInspectionResult.Hold ? [] : items,
      testParameters: fromParameterGridRows(parameters),
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setFormError(first?.message ?? 'Invalid result payload');
      return;
    }

    try {
      await complete.mutateAsync({
        id: inspection.id,
        input: {
          result: parsed.data.result,
          remarks: parsed.data.remarks ?? null,
          items:
            parsed.data.result === QualityInspectionResult.Hold
              ? undefined
              : parsed.data.items.map((line) => ({
                  grnLineId: line.grnLineId,
                  acceptedQuantity: line.acceptedQuantity,
                  rejectedQuantity: line.rejectedQuantity,
                  rejectionReason: line.rejectionReason,
                })),
          testParameters: fromParameterGridRows(parameters),
        },
      });
      success(
        `Inspection completed — ${qualityInspectionResultLabel(parsed.data.result)}`,
      );
      onClose();
      onCompleted?.();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      data-testid="result-actions-dialog"
    >
      <DialogTitle>
        Record result
        {inspection ? ` · ${inspection.inspectionNumber}` : ''}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Requires quality.inspect. Accepted / partial / rejected update the
            GRN; hold keeps the GRN in quality check. Rejected stock never
            becomes available.
          </Typography>

          <FormControl size="small" fullWidth>
            <InputLabel id="qi-result">Result</InputLabel>
            <Select
              labelId="qi-result"
              label="Result"
              value={result}
              onChange={(e) => setResult(e.target.value)}
            >
              {RESULT_OPTIONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {qualityInspectionResultLabel(r)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {result !== QualityInspectionResult.Hold ? (
            <InspectionLinesGrid
              value={items}
              onChange={setItems}
              materialLabel={materialLabel}
              error={formError}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Hold does not require line quantities. The GRN remains in quality
              check with no stock movement.
            </Typography>
          )}

          <ParameterGrid value={parameters} onChange={setParameters} />

          <TextField
            label="Remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          {formError && result === QualityInspectionResult.Hold ? (
            <Typography variant="body2" color="error">
              {formError}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={complete.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void onSubmit()}
          disabled={complete.isPending || !inspection}
        >
          {complete.isPending ? 'Saving…' : 'Complete inspection'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
