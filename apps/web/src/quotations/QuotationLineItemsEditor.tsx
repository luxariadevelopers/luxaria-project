import {
  Checkbox,
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
  type UseFormSetValue,
} from 'react-hook-form';
import { formatInr } from '@/format';
import { materialUnitLabel } from './labels';
import { computeLineTotal } from './totals';
import type { QuotationFormValues } from './validation';

type Props = {
  control: Control<QuotationFormValues>;
  fields: FieldArrayWithId<QuotationFormValues, 'items', 'id'>[];
  setValue: UseFormSetValue<QuotationFormValues>;
  readOnly?: boolean;
};

export function QuotationLineItemsEditor({
  control,
  fields,
  setValue,
  readOnly = false,
}: Props) {
  const items = useWatch({ control, name: 'items' }) ?? [];

  if (fields.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Select a purchase request to load quotable line items.
      </Typography>
    );
  }

  return (
    <Stack spacing={1} data-testid="quotation-line-items-editor">
      <Typography variant="subtitle2">PR line items</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">Incl.</TableCell>
            <TableCell>Material</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell align="right">Rate</TableCell>
            <TableCell align="right">Tax</TableCell>
            <TableCell align="right">Discount</TableCell>
            <TableCell align="right">Line total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((field, index) => {
            const item = items[index];
            const selected = Boolean(item?.selected);
            const lineTotal = item
              ? computeLineTotal({
                  quantity: Number(item.quantity),
                  rate: Number(item.rate),
                  tax: Number(item.tax),
                  discount: Number(item.discount),
                })
              : 0;

            return (
              <TableRow key={field.id} hover>
                <TableCell padding="checkbox">
                  <Controller
                    name={`items.${index}.selected`}
                    control={control}
                    render={({ field: f }) => (
                      <Checkbox
                        checked={Boolean(f.value)}
                        onChange={(e) => f.onChange(e.target.checked)}
                        disabled={readOnly}
                        slotProps={{
                          input: {
                            'aria-label': `Include ${field.materialLabel}`,
                          },
                        }}
                      />
                    )}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{field.materialLabel}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {materialUnitLabel(item?.unit ?? field.unit)}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 88 }}>
                  <TextField
                    size="small"
                    type="number"
                    disabled={readOnly || !selected}
                    value={item?.quantity ?? 0}
                    onChange={(e) =>
                      setValue(
                        `items.${index}.quantity`,
                        Number(e.target.value),
                        { shouldValidate: true },
                      )
                    }
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 96 }}>
                  <TextField
                    size="small"
                    type="number"
                    disabled={readOnly || !selected}
                    value={item?.rate ?? 0}
                    onChange={(e) =>
                      setValue(`items.${index}.rate`, Number(e.target.value), {
                        shouldValidate: true,
                      })
                    }
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 88 }}>
                  <TextField
                    size="small"
                    type="number"
                    disabled={readOnly || !selected}
                    value={item?.tax ?? 0}
                    onChange={(e) =>
                      setValue(`items.${index}.tax`, Number(e.target.value), {
                        shouldValidate: true,
                      })
                    }
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 88 }}>
                  <TextField
                    size="small"
                    type="number"
                    disabled={readOnly || !selected}
                    value={item?.discount ?? 0}
                    onChange={(e) =>
                      setValue(
                        `items.${index}.discount`,
                        Number(e.target.value),
                        { shouldValidate: true },
                      )
                    }
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {selected ? formatInr(lineTotal) : '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Stack>
  );
}
