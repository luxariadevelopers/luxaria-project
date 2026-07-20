import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Controller,
  useWatch,
  type Control,
  type FieldArrayWithId,
} from 'react-hook-form';
import { formatInr, formatQuantity } from '@/format';
import { MoneyInput } from '@/components/forms';
import { materialUnitLabel } from './labels';
import { computeLineTotal } from './totals';
import type { ApprovedSourceLine } from './types';
import type { PurchaseOrderFormValues } from './validation';

type Props = {
  control: Control<PurchaseOrderFormValues>;
  fields: FieldArrayWithId<PurchaseOrderFormValues, 'items', 'id'>[];
  sourceByMaterialId: ReadonlyMap<string, ApprovedSourceLine>;
  disabled?: boolean;
};

/**
 * PO line grid prefilled from approved quotation.
 * Rate/unit stay locked to the source; qty may be reduced (not increased).
 */
export function POItemsGrid({
  control,
  fields,
  sourceByMaterialId,
  disabled = false,
}: Props) {
  const items = useWatch({ control, name: 'items' }) ?? [];

  return (
    <Box data-testid="po-items-grid">
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1, justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography variant="subtitle1">Items</Typography>
        <Typography variant="caption" color="text.secondary">
          Rates and units from approved quotation; qty cannot exceed source.
        </Typography>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width={40}>#</TableCell>
            <TableCell>Material</TableCell>
            <TableCell width={88}>Unit</TableCell>
            <TableCell align="right" width={110}>
              Qty
            </TableCell>
            <TableCell align="right" width={110}>
              Rate
            </TableCell>
            <TableCell align="right" width={110}>
              Tax
            </TableCell>
            <TableCell align="right" width={110}>
              Discount
            </TableCell>
            <TableCell align="right" width={120}>
              Line total
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((field, index) => {
            const row = items[index];
            const source = row
              ? sourceByMaterialId.get(row.materialId)
              : undefined;
            const maxQty = source?.quantity;
            const lineTotal = row
              ? computeLineTotal({
                  quantity: Number(row.quantity ?? 0),
                  rate: Number(row.rate ?? 0),
                  tax: Number(row.tax ?? 0),
                  discount: Number(row.discount ?? 0),
                })
              : 0;
            const label =
              row?.materialCode ||
              row?.materialName ||
              row?.materialId ||
              '—';

            return (
              <TableRow key={field.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Typography variant="body2">{label}</Typography>
                  {maxQty != null ? (
                    <Typography variant="caption" color="text.secondary">
                      Approved qty {formatQuantity(maxQty)}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>
                  {row?.unit ? materialUnitLabel(row.unit) : '—'}
                </TableCell>
                <TableCell align="right">
                  <Controller
                    name={`items.${index}.quantity`}
                    control={control}
                    render={({ field: qtyField, fieldState }) => (
                      <TextField
                        {...qtyField}
                        type="number"
                        size="small"
                        disabled={disabled}
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                        slotProps={{
                          htmlInput: {
                            min: QTY_STEP,
                            max: maxQty,
                            step: 'any',
                          },
                        }}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          qtyField.onChange(
                            Number.isFinite(n) ? n : e.target.value,
                          );
                        }}
                        sx={{ width: 100 }}
                      />
                    )}
                  />
                </TableCell>
                <TableCell align="right">
                  <MoneyInput
                    name={`items.${index}.rate`}
                    control={control}
                    size="small"
                    disabled
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <MoneyInput
                    name={`items.${index}.tax`}
                    control={control}
                    size="small"
                    disabled={disabled}
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <MoneyInput
                    name={`items.${index}.discount`}
                    control={control}
                    size="small"
                    disabled={disabled}
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{formatInr(lineTotal)}</Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

const QTY_STEP = Number.EPSILON;
