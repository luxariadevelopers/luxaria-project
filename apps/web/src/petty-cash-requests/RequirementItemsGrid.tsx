import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
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
  type UseFieldArrayAppend,
  type UseFieldArrayRemove,
} from 'react-hook-form';
import { formatInr } from '@/format';
import { MoneyInput } from '@/components/forms';
import { EXPENSE_CATEGORY_OPTIONS } from './labels';
import { sumRequirementItemAmounts } from './itemTotals';
import {
  emptyRequirementItem,
  type PettyCashRequestFormValues,
} from './validation';

type Props = {
  control: Control<PettyCashRequestFormValues>;
  fields: FieldArrayWithId<
    PettyCashRequestFormValues,
    'requirementItems',
    'id'
  >[];
  append: UseFieldArrayAppend<
    PettyCashRequestFormValues,
    'requirementItems'
  >;
  remove: UseFieldArrayRemove;
  disabled?: boolean;
  /** Read-only table when editing is not allowed. */
  readOnly?: boolean;
};

/**
 * Itemised weekly requirement lines with category, description, amount.
 * Footer shows the requested total (sum of estimated amounts).
 */
export function RequirementItemsGrid({
  control,
  fields,
  append,
  remove,
  disabled = false,
  readOnly = false,
}: Props) {
  const items = useWatch({ control, name: 'requirementItems' }) ?? [];
  const total = sumRequirementItemAmounts(items);
  const locked = disabled || readOnly;
  const usedCategories = new Set(
    items.map((item) => item?.expenseCategory).filter(Boolean),
  );
  const nextUnusedCategory = EXPENSE_CATEGORY_OPTIONS.find(
    (opt) => !usedCategories.has(opt.value),
  );

  return (
    <Box data-testid="requirement-items-grid">
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1, justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography variant="subtitle1">Requirement items</Typography>
        {!readOnly ? (
          <Button
            size="small"
            variant="outlined"
            disabled={locked || !nextUnusedCategory}
            onClick={() =>
              append({
                ...emptyRequirementItem(),
                expenseCategory:
                  nextUnusedCategory?.value ??
                  emptyRequirementItem().expenseCategory,
              })
            }
            data-testid="add-requirement-item"
          >
            + Add another item
          </Button>
        ) : null}
      </Stack>
      {!readOnly ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Each category (e.g. Labour) can only appear on one line.
        </Typography>
      ) : null}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width={48}>#</TableCell>
            <TableCell width={160}>Category</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right" width={140}>
              Amount
            </TableCell>
            {!readOnly ? <TableCell width={72} /> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={field.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <Controller
                  name={`requirementItems.${index}.expenseCategory`}
                  control={control}
                  render={({ field: f, fieldState }) => (
                    <FormControl
                      size="small"
                      fullWidth
                      disabled={locked}
                      error={Boolean(fieldState.error)}
                    >
                      <InputLabel id={`pcr-cat-${index}`}>Category</InputLabel>
                      <Select
                        {...f}
                        labelId={`pcr-cat-${index}`}
                        label="Category"
                      >
                        {EXPENSE_CATEGORY_OPTIONS.map((opt) => {
                          const takenByOther =
                            usedCategories.has(opt.value) &&
                            items[index]?.expenseCategory !== opt.value;
                          return (
                            <MenuItem
                              key={opt.value}
                              value={opt.value}
                              disabled={takenByOther}
                            >
                              {opt.label}
                              {takenByOther ? ' (already used)' : ''}
                            </MenuItem>
                          );
                        })}
                      </Select>
                      {fieldState.error?.message ? (
                        <Typography variant="caption" color="error">
                          {fieldState.error.message}
                        </Typography>
                      ) : null}
                    </FormControl>
                  )}
                />
              </TableCell>
              <TableCell>
                <Controller
                  name={`requirementItems.${index}.description`}
                  control={control}
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      size="small"
                      fullWidth
                      disabled={locked}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                      placeholder="What the cash is for"
                    />
                  )}
                />
              </TableCell>
              <TableCell align="right">
                <MoneyInput
                  name={`requirementItems.${index}.estimatedAmount`}
                  control={control}
                  size="small"
                  disabled={locked}
                  fullWidth
                />
              </TableCell>
              {!readOnly ? (
                <TableCell>
                  <Button
                    size="small"
                    color="inherit"
                    disabled={locked || fields.length <= 1}
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Stack
        direction="row"
        sx={{ mt: 1.5, justifyContent: 'flex-end' }}
        data-testid="requirement-items-total"
      >
        <Typography variant="body2">
          Requested total:{' '}
          <strong>{formatInr(total)}</strong>
        </Typography>
      </Stack>
    </Box>
  );
}
