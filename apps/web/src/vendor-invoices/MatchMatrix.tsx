import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatInr } from '@/format';
import { varianceSeverityLabel, varianceTypeLabel } from './labels';
import type { PublicVendorInvoice } from './types';
import { VendorInvoiceVarianceSeverity } from './types';

type Props = {
  invoice: PublicVendorInvoice;
};

/**
 * PO ↔ GRN accepted ↔ Invoice line matrix after three-way match.
 */
export function MatchMatrix({ invoice }: Props) {
  return (
    <Paper variant="outlined" data-testid="match-matrix" sx={{ overflow: 'auto' }}>
      <Typography variant="subtitle2" sx={{ p: 1.5, pb: 0 }}>
        Line comparison
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Material</TableCell>
            <TableCell align="right">Invoice qty</TableCell>
            <TableCell align="right">GRN accepted</TableCell>
            <TableCell align="right">PO ordered</TableCell>
            <TableCell align="right">Invoice rate</TableCell>
            <TableCell align="right">PO rate</TableCell>
            <TableCell align="right">Qty var</TableCell>
            <TableCell align="right">Rate var</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoice.items.map((item) => (
            <TableRow key={item.id || item.materialId}>
              <TableCell>
                {[item.materialCode, item.materialName]
                  .filter(Boolean)
                  .join(' — ') || item.materialId.slice(-6)}
              </TableCell>
              <TableCell align="right">{item.quantity}</TableCell>
              <TableCell align="right">
                {item.grnAcceptedQuantity ?? '—'}
              </TableCell>
              <TableCell align="right">
                {item.poOrderedQuantity ?? '—'}
              </TableCell>
              <TableCell align="right">{formatInr(item.rate)}</TableCell>
              <TableCell align="right">
                {item.poRate != null ? formatInr(item.poRate) : '—'}
              </TableCell>
              <TableCell align="right">
                {item.quantityVariance ?? '—'}
              </TableCell>
              <TableCell align="right">
                {item.rateVariance != null
                  ? formatInr(item.rateVariance)
                  : '—'}
              </TableCell>
              <TableCell align="right">{formatInr(item.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Typography variant="subtitle2" sx={{ p: 1.5, pb: 0 }}>
        Variances
      </Typography>
      {invoice.variances.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
          No variances — clean match.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Expected</TableCell>
              <TableCell>Actual</TableCell>
              <TableCell>Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoice.variances.map((v) => (
              <TableRow key={v.id || `${v.type}-${v.message}`}>
                <TableCell>{varianceTypeLabel(v.type)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={
                      v.severity === VendorInvoiceVarianceSeverity.Exception
                        ? 'error'
                        : v.severity === VendorInvoiceVarianceSeverity.Warning
                          ? 'warning'
                          : 'default'
                    }
                    label={varianceSeverityLabel(v.severity)}
                  />
                </TableCell>
                <TableCell>{v.expected ?? '—'}</TableCell>
                <TableCell>{v.actual ?? '—'}</TableCell>
                <TableCell>{v.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
