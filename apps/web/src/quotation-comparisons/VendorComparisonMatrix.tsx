import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatInr } from '@/format';
import type { PublicComparisonVendorRow } from './types';

type Props = {
  vendors: readonly PublicComparisonVendorRow[];
  selectedQuotationId?: string | null;
  onSelectQuotation?: (quotationId: string) => void;
  selectable?: boolean;
};

function scoreLabel(value: number | null): string {
  return value == null ? '—' : value.toFixed(1);
}

/**
 * Landed-cost + performance matrix for vendor quotations on a PR.
 */
export function VendorComparisonMatrix({
  vendors,
  selectedQuotationId,
  onSelectQuotation,
  selectable = false,
}: Props) {
  if (vendors.length === 0) {
    return (
      <Typography color="text.secondary">
        No vendor rows in this comparison statement.
      </Typography>
    );
  }

  const sorted = [...vendors].sort(
    (a, b) => a.netLandedCost - b.netLandedCost,
  );

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      data-testid="vendor-comparison-matrix"
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Vendor</TableCell>
            <TableCell>Quotation</TableCell>
            <TableCell align="right">Base rate</TableCell>
            <TableCell align="right">GST</TableCell>
            <TableCell align="right">Freight</TableCell>
            <TableCell align="right">Discount</TableCell>
            <TableCell align="right">Net landed</TableCell>
            <TableCell align="right">Delivery (days)</TableCell>
            <TableCell>Payment terms</TableCell>
            <TableCell align="right">Rating</TableCell>
            <TableCell align="right">Prev. quality</TableCell>
            <TableCell align="right">Prev. delivery</TableCell>
            <TableCell>Flags</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row) => {
            const selected =
              selectedQuotationId != null &&
              selectedQuotationId === row.quotationId;
            const clickable = selectable && Boolean(onSelectQuotation);

            return (
              <TableRow
                key={row.id || row.quotationId}
                hover={clickable}
                selected={selected}
                onClick={
                  clickable
                    ? () => onSelectQuotation?.(row.quotationId)
                    : undefined
                }
                sx={clickable ? { cursor: 'pointer' } : undefined}
                data-testid={`vendor-row-${row.quotationId}`}
                data-lowest={row.isLowestLandedCost ? 'true' : 'false'}
                data-recommended={row.isRecommended ? 'true' : 'false'}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.vendorName ?? row.vendorCode ?? row.vendorId}
                  </Typography>
                  {row.vendorCode ? (
                    <Typography variant="caption" color="text.secondary">
                      {row.vendorCode}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>{row.quotationNumber}</TableCell>
                <TableCell align="right">
                  {formatInr(row.baseMaterialRate)}
                </TableCell>
                <TableCell align="right">{formatInr(row.gst)}</TableCell>
                <TableCell align="right">{formatInr(row.freight)}</TableCell>
                <TableCell align="right">{formatInr(row.discount)}</TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: row.isLowestLandedCost ? 700 : 500,
                    }}
                  >
                    {formatInr(row.netLandedCost)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{row.deliveryDays}</TableCell>
                <TableCell>{row.paymentTerms ?? '—'}</TableCell>
                <TableCell align="right">
                  {scoreLabel(row.vendorRating)}
                </TableCell>
                <TableCell align="right">
                  {scoreLabel(row.previousQuality)}
                </TableCell>
                <TableCell align="right">
                  {scoreLabel(row.previousDeliveryPerformance)}
                </TableCell>
                <TableCell>
                  {row.isLowestLandedCost ? (
                    <Chip
                      size="small"
                      color="success"
                      variant="outlined"
                      label="Lowest"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ) : null}
                  {row.isRecommended ? (
                    <Chip
                      size="small"
                      color="primary"
                      label="Recommended"
                      sx={{ mb: 0.5 }}
                    />
                  ) : null}
                  {selected && !row.isRecommended ? (
                    <Chip
                      size="small"
                      color="secondary"
                      variant="outlined"
                      label="Selected"
                      sx={{ mb: 0.5 }}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
