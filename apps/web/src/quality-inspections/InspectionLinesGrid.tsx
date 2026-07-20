import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { InspectionLineDecisionFormValues } from './validation';

type Props = {
  value: InspectionLineDecisionFormValues[];
  onChange: (next: InspectionLineDecisionFormValues[]) => void;
  /** Optional material labels keyed by grnLineId. */
  materialLabel?: (grnLineId: string) => string;
  readOnly?: boolean;
  title?: string;
  error?: string | null;
};

/**
 * Line-level accept/reject quantities for Nest complete payload `items`.
 */
export function InspectionLinesGrid({
  value,
  onChange,
  materialLabel,
  readOnly = false,
  title = 'Line decisions',
  error,
}: Props) {
  const update = (
    index: number,
    patch: Partial<InspectionLineDecisionFormValues>,
  ) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="inspection-lines-grid">
      <Stack spacing={1.5}>
        <Typography variant="subtitle1">{title}</Typography>
        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : null}
        {value.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No GRN lines on this inspection.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Material</TableCell>
                <TableCell align="right">Received</TableCell>
                <TableCell align="right">Accepted</TableCell>
                <TableCell align="right">Rejected</TableCell>
                <TableCell>Rejection reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {value.map((row, index) => (
                <TableRow key={row.grnLineId}>
                  <TableCell>
                    {materialLabel?.(row.grnLineId) ?? row.grnLineId}
                  </TableCell>
                  <TableCell align="right">{row.receivedQuantity}</TableCell>
                  <TableCell align="right">
                    {readOnly ? (
                      row.acceptedQuantity
                    ) : (
                      <TextField
                        size="small"
                        type="number"
                        value={row.acceptedQuantity}
                        slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                        onChange={(e) =>
                          update(index, {
                            acceptedQuantity: Number(e.target.value),
                          })
                        }
                        sx={{ width: 100 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {readOnly ? (
                      row.rejectedQuantity
                    ) : (
                      <TextField
                        size="small"
                        type="number"
                        value={row.rejectedQuantity}
                        slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                        onChange={(e) =>
                          update(index, {
                            rejectedQuantity: Number(e.target.value),
                          })
                        }
                        sx={{ width: 100 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      row.rejectionReason || '—'
                    ) : (
                      <TextField
                        size="small"
                        fullWidth
                        placeholder={
                          row.rejectedQuantity > 0
                            ? 'Required (≥ 3 chars)'
                            : 'Optional'
                        }
                        value={row.rejectionReason ?? ''}
                        disabled={row.rejectedQuantity <= 0}
                        onChange={(e) =>
                          update(index, {
                            rejectionReason: e.target.value || null,
                          })
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Typography variant="caption" color="text.secondary">
          accepted + rejected must equal received. Rejection reason is required
          when rejected quantity &gt; 0.
        </Typography>
      </Stack>
    </Paper>
  );
}
