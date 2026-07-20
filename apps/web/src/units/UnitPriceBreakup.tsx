import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import { formatInr } from '@/format';
import { computeTotalPrice } from './validation';
import type { PublicUnit } from './types';

type Props = {
  unit: PublicUnit;
};

export function UnitPriceBreakup({ unit }: Props) {
  const total = computeTotalPrice({
    basePrice: unit.basePrice,
    additionalCharges: unit.additionalCharges,
    tax: unit.tax,
  });

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="unit-price-breakup">
      <Stack spacing={1.5}>
        <Typography variant="subtitle1">Price breakup</Typography>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell>Base price</TableCell>
              <TableCell align="right">{formatInr(unit.basePrice)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Additional charges</TableCell>
              <TableCell align="right">
                {formatInr(unit.additionalCharges)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Tax</TableCell>
              <TableCell align="right">{formatInr(unit.tax)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <strong>Total</strong>
              </TableCell>
              <TableCell align="right">
                <strong>{formatInr(unit.totalPrice || total)}</strong>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Stack>
    </Paper>
  );
}
