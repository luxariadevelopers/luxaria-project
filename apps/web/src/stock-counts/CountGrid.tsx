import {
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import { materialUnitLabel } from './labels';
import type { CountGridRow } from './types';
import type { CountGridFieldErrors } from './validation';
import { computeDifference, isLargeVariance } from './variance';

type Props = {
  rows: readonly CountGridRow[];
  readOnly?: boolean;
  fieldErrors?: CountGridFieldErrors;
  onChange?: (rows: CountGridRow[]) => void;
  /** Show Nest-posted ledger entry links when posted. */
  ledgerLinks?: ReadonlyMap<string, string | null>;
};

/**
 * Physical vs system quantity grid with variance, reason, and photo document id.
 */
export function CountGrid({
  rows,
  readOnly = false,
  fieldErrors,
  onChange,
  ledgerLinks,
}: Props) {
  const updateRow = (key: string, patch: Partial<CountGridRow>) => {
    if (!onChange) return;
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    if (!onChange) return;
    onChange(rows.filter((r) => r.key !== key));
  };

  return (
    <Stack spacing={1} data-testid="count-grid">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Material</TableCell>
            <TableCell align="right">System</TableCell>
            <TableCell align="right">Physical</TableCell>
            <TableCell align="right">Diff</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>Photo id</TableCell>
            <TableCell>Variance</TableCell>
            {ledgerLinks ? <TableCell>Ledger</TableCell> : null}
            {!readOnly ? <TableCell width={48} /> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const difference = computeDifference(
              row.physicalQuantity,
              row.systemQuantity,
            );
            const large = isLargeVariance({
              systemQuantity: row.systemQuantity,
              difference,
            });
            const err = fieldErrors?.rows?.[row.key];
            const materialLabel =
              [row.materialCode, row.materialName]
                .filter(Boolean)
                .join(' · ') || row.materialId;

            return (
              <TableRow key={row.key}>
                <TableCell>
                  <Typography variant="body2">{materialLabel}</Typography>
                </TableCell>
                <TableCell align="right">{row.systemQuantity}</TableCell>
                <TableCell align="right" sx={{ minWidth: 100 }}>
                  {readOnly ? (
                    row.physicalQuantity
                  ) : (
                    <TextField
                      size="small"
                      type="number"
                      value={row.physicalQuantity}
                      error={Boolean(err?.physicalQuantity)}
                      helperText={err?.physicalQuantity}
                      slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                      onChange={(e) =>
                        updateRow(row.key, {
                          physicalQuantity: Number(e.target.value),
                        })
                      }
                    />
                  )}
                </TableCell>
                <TableCell align="right">{difference}</TableCell>
                <TableCell>{materialUnitLabel(row.baseUnit)}</TableCell>
                <TableCell sx={{ minWidth: 160 }}>
                  {readOnly ? (
                    row.reason || '—'
                  ) : (
                    <TextField
                      size="small"
                      fullWidth
                      value={row.reason}
                      error={Boolean(err?.reason)}
                      helperText={err?.reason}
                      placeholder={
                        Math.abs(difference) >= 1e-9
                          ? 'Required for difference'
                          : 'Optional'
                      }
                      onChange={(e) =>
                        updateRow(row.key, { reason: e.target.value })
                      }
                    />
                  )}
                </TableCell>
                <TableCell sx={{ minWidth: 120 }}>
                  {readOnly ? (
                    row.photo || '—'
                  ) : (
                    <TextField
                      size="small"
                      fullWidth
                      value={row.photo}
                      placeholder="Document id"
                      onChange={(e) =>
                        updateRow(row.key, { photo: e.target.value })
                      }
                    />
                  )}
                </TableCell>
                <TableCell>
                  {large ? (
                    <Typography
                      variant="caption"
                      color="warning.main"
                      data-testid="count-line-large-variance"
                    >
                      Large
                    </Typography>
                  ) : Math.abs(difference) >= 1e-9 ? (
                    'Within'
                  ) : (
                    '—'
                  )}
                </TableCell>
                {ledgerLinks ? (
                  <TableCell>
                    {(() => {
                      const ledgerId = ledgerLinks.get(row.materialId);
                      if (!ledgerId) return '—';
                      return (
                        <Link
                          component={RouterLink}
                          to={`/inventory/stock-ledger`}
                          variant="body2"
                          title={ledgerId}
                        >
                          {ledgerId.slice(-6)}
                        </Link>
                      );
                    })()}
                  </TableCell>
                ) : null}
                {!readOnly ? (
                  <TableCell>
                    <IconButton
                      size="small"
                      aria-label="Remove line"
                      onClick={() => removeRow(row.key)}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No count lines yet.
        </Typography>
      ) : null}
      {fieldErrors?.form ? (
        <Typography variant="body2" color="error">
          {fieldErrors.form}
        </Typography>
      ) : null}
    </Stack>
  );
}
