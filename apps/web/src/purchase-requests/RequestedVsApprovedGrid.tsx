import {
  Alert,
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { formatInr } from '@/format';
import {
  materialUnitLabel,
  purchaseRequestLineStatusLabel,
} from './labels';
import type { PublicPurchaseRequestItem } from './types';

export type ApproveLineDecision = {
  lineId: string;
  approvedQuantity: number;
};

type Props = {
  items: readonly PublicPurchaseRequestItem[];
  /** When set, shows editable approved-qty inputs for approval. */
  decisions?: readonly ApproveLineDecision[];
  onDecisionChange?: (lineId: string, approvedQuantity: number) => void;
  lineErrors?: Record<string, string>;
  disabled?: boolean;
  emptyMessage?: string;
};

/**
 * Requested vs approved line grid (Phase 062).
 * Read-only on detail; editable inside the approve dialog.
 */
export function RequestedVsApprovedGrid({
  items,
  decisions,
  onDecisionChange,
  lineErrors = {},
  disabled = false,
  emptyMessage = 'No line items on this request.',
}: Props) {
  const editable = Boolean(decisions && onDecisionChange);
  const decisionById = new Map(
    (decisions ?? []).map((d) => [d.lineId, d.approvedQuantity]),
  );

  if (items.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Box data-testid="requested-vs-approved-grid">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width={40}>#</TableCell>
            <TableCell>Material</TableCell>
            <TableCell align="right">Stock</TableCell>
            <TableCell align="right">Requested</TableCell>
            <TableCell align="right">Approved</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell align="right">Est. amount</TableCell>
            <TableCell>Line status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, index) => {
            const approvedDisplay = editable
              ? (decisionById.get(item.id) ?? item.requestedQuantity)
              : item.approvedQuantity;
            const err = lineErrors[item.id];

            return (
              <TableRow key={item.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant="body2">
                      {item.materialName?.trim() ||
                        item.materialCode?.trim() ||
                        item.materialId}
                    </Typography>
                    {item.materialCode ? (
                      <Typography variant="caption" color="text.secondary">
                        {item.materialCode}
                      </Typography>
                    ) : null}
                    {item.warnings.length > 0 ? (
                      <Alert severity="warning" sx={{ py: 0, mt: 0.5 }}>
                        {item.warnings[0]}
                      </Alert>
                    ) : null}
                    {err ? (
                      <Typography variant="caption" color="error">
                        {err}
                      </Typography>
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell align="right">{item.currentStock}</TableCell>
                <TableCell align="right">{item.requestedQuantity}</TableCell>
                <TableCell align="right">
                  {editable ? (
                    <TextField
                      size="small"
                      type="number"
                      slotProps={{
                        htmlInput: {
                          min: 0,
                          max: item.requestedQuantity,
                          step: 'any',
                          'data-testid': `approve-qty-${item.id}`,
                        },
                      }}
                      value={approvedDisplay ?? 0}
                      disabled={disabled}
                      error={Boolean(err)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const next =
                          raw === '' ? 0 : Number.parseFloat(raw);
                        onDecisionChange?.(
                          item.id,
                          Number.isFinite(next) ? next : 0,
                        );
                      }}
                      sx={{ width: 110 }}
                    />
                  ) : (
                    (approvedDisplay ?? '—')
                  )}
                </TableCell>
                <TableCell>{materialUnitLabel(String(item.unit))}</TableCell>
                <TableCell align="right">
                  {item.estimatedAmount != null
                    ? formatInr(item.estimatedAmount)
                    : '—'}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={purchaseRequestLineStatusLabel(item.lineStatus)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
