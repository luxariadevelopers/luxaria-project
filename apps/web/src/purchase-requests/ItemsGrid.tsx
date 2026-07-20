import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
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
  type UseFormSetValue,
} from 'react-hook-form';
import { MoneyInput } from '@/components/forms';
import { formatInr } from '@/format';
import { fetchBoqItems, fetchMaterials } from './api';
import { sumEstimatedTotal } from './itemTotals';
import { materialUnitLabel } from './labels';
import {
  buildQuantityWarnings,
  convertBaseToUnit,
} from './stockWarnings';
import type { PublicBoqItemOption, PublicMaterial } from './types';
import { useMaterialStockBalance } from './usePurchaseRequests';
import {
  allowedUnitsForMaterial,
  emptyPurchaseRequestItem,
  type PurchaseRequestFormValues,
} from './validation';

type Props = {
  control: Control<PurchaseRequestFormValues>;
  setValue: UseFormSetValue<PurchaseRequestFormValues>;
  fields: FieldArrayWithId<PurchaseRequestFormValues, 'items', 'id'>[];
  append: UseFieldArrayAppend<PurchaseRequestFormValues, 'items'>;
  remove: UseFieldArrayRemove;
  projectId: string | null;
  canViewStock: boolean;
  canViewBoq: boolean;
  disabled?: boolean;
};

type MaterialCache = Map<string, PublicMaterial>;

/**
 * Itemised PR lines: material, qty, unit, rate, BOQ, current stock, warnings.
 * Footer shows Nest-aligned estimated total.
 */
export function ItemsGrid({
  control,
  setValue,
  fields,
  append,
  remove,
  projectId,
  canViewStock,
  canViewBoq,
  disabled = false,
}: Props) {
  const items = useWatch({ control, name: 'items' }) ?? [];
  const total = sumEstimatedTotal(items);
  const [materialCache, setMaterialCache] = useState<MaterialCache>(
    () => new Map(),
  );

  const rememberMaterial = (material: PublicMaterial) => {
    setMaterialCache((prev) => {
      if (prev.get(material.id) === material) return prev;
      const next = new Map(prev);
      next.set(material.id, material);
      return next;
    });
  };

  return (
    <Box data-testid="pr-items-grid">
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1, justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography variant="subtitle1">Request items</Typography>
        <Button
          size="small"
          disabled={disabled}
          onClick={() => append(emptyPurchaseRequestItem())}
        >
          Add item
        </Button>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width={40}>#</TableCell>
            <TableCell sx={{ minWidth: 220 }}>Material</TableCell>
            <TableCell width={110} align="right">
              Qty
            </TableCell>
            <TableCell width={120}>Unit</TableCell>
            <TableCell width={120} align="right">
              Est. rate
            </TableCell>
            {canViewBoq ? (
              <TableCell sx={{ minWidth: 180 }}>BOQ line</TableCell>
            ) : null}
            <TableCell width={120} align="right">
              Current stock
            </TableCell>
            <TableCell width={72} />
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((field, index) => (
            <ItemRow
              key={field.id}
              index={index}
              control={control}
              setValue={setValue}
              projectId={projectId}
              canViewStock={canViewStock}
              canViewBoq={canViewBoq}
              disabled={disabled}
              materialCache={materialCache}
              onMaterialResolved={rememberMaterial}
              canRemove={fields.length > 1}
              onRemove={() => remove(index)}
            />
          ))}
        </TableBody>
      </Table>

      <Stack
        direction="row"
        sx={{ mt: 1.5, justifyContent: 'flex-end' }}
        data-testid="pr-estimated-total"
      >
        <Typography variant="body2">
          Estimated total: <strong>{formatInr(total)}</strong>
        </Typography>
      </Stack>
    </Box>
  );
}

type ItemRowProps = {
  index: number;
  control: Control<PurchaseRequestFormValues>;
  setValue: UseFormSetValue<PurchaseRequestFormValues>;
  projectId: string | null;
  canViewStock: boolean;
  canViewBoq: boolean;
  disabled: boolean;
  materialCache: MaterialCache;
  onMaterialResolved: (material: PublicMaterial) => void;
  canRemove: boolean;
  onRemove: () => void;
};

function ItemRow({
  index,
  control,
  setValue,
  projectId,
  canViewStock,
  canViewBoq,
  disabled,
  materialCache,
  onMaterialResolved,
  canRemove,
  onRemove,
}: ItemRowProps) {
  const materialId = useWatch({
    control,
    name: `items.${index}.materialId`,
  });
  const unit = useWatch({ control, name: `items.${index}.unit` });
  const requestedQuantity = useWatch({
    control,
    name: `items.${index}.requestedQuantity`,
  });

  const material = materialId ? materialCache.get(materialId) : undefined;

  const stockQuery = useMaterialStockBalance(
    projectId,
    materialId || null,
    Boolean(materialId) && canViewStock,
  );

  const allowedUnits = useMemo(
    () => (material ? allowedUnitsForMaterial(material) : []),
    [material],
  );

  const currentStockDisplay = useMemo(() => {
    if (!material || !canViewStock) return null;
    if (stockQuery.isLoading) return '…';
    if (stockQuery.error) return '—';
    const qtyInBase = stockQuery.data?.quantityInBaseUnit ?? 0;
    const inLineUnit = convertBaseToUnit(
      qtyInBase,
      unit,
      material.baseUnit,
      material.conversionFactors,
    );
    if (inLineUnit == null) {
      return `${qtyInBase} ${materialUnitLabel(material.baseUnit)}`;
    }
    return `${roundDisplay(inLineUnit)} ${materialUnitLabel(unit)}`;
  }, [material, canViewStock, stockQuery, unit]);

  const warnings = useMemo(() => {
    if (!material || !canViewStock) return [];
    const currentStockInBase = stockQuery.data?.quantityInBaseUnit ?? 0;
    return buildQuantityWarnings({
      requestedQuantity: Number(requestedQuantity) || 0,
      unit,
      baseUnit: material.baseUnit,
      conversionFactors: material.conversionFactors,
      currentStockInBase,
      reorderLevel: material.reorderLevel,
      minimumStock: material.minimumStock,
      maximumStock: material.maximumStock,
    });
  }, [material, canViewStock, stockQuery.data, requestedQuantity, unit]);

  useEffect(() => {
    if (!material || allowedUnits.length === 0) return;
    if (!allowedUnits.includes(unit)) {
      setValue(`items.${index}.unit`, material.baseUnit);
    }
  }, [material, allowedUnits, unit, setValue, index]);

  return (
    <>
      <TableRow>
        <TableCell>{index + 1}</TableCell>
        <TableCell>
          <MaterialPicker
            value={materialId}
            disabled={disabled}
            cached={material}
            onChange={(next) => {
              if (next) {
                onMaterialResolved(next);
                setValue(`items.${index}.materialId`, next.id, {
                  shouldValidate: true,
                });
                setValue(`items.${index}.unit`, next.baseUnit);
                setValue(
                  `items.${index}.estimatedRate`,
                  next.standardRate ?? null,
                );
              } else {
                setValue(`items.${index}.materialId`, '', {
                  shouldValidate: true,
                });
              }
            }}
          />
        </TableCell>
        <TableCell align="right">
          <Controller
            name={`items.${index}.requestedQuantity`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="number"
                size="small"
                fullWidth
                disabled={disabled}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                onChange={(e) => {
                  const raw = e.target.value;
                  field.onChange(raw === '' ? '' : Number(raw));
                }}
              />
            )}
          />
        </TableCell>
        <TableCell>
          <Controller
            name={`items.${index}.unit`}
            control={control}
            render={({ field, fieldState }) => (
              <FormControl
                size="small"
                fullWidth
                disabled={disabled || !material}
                error={Boolean(fieldState.error)}
              >
                <InputLabel id={`pr-unit-${index}`}>Unit</InputLabel>
                <Select {...field} labelId={`pr-unit-${index}`} label="Unit">
                  {(allowedUnits.length > 0
                    ? allowedUnits
                    : [field.value]
                  ).map((u) => (
                    <MenuItem key={u} value={u}>
                      {materialUnitLabel(u)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        </TableCell>
        <TableCell align="right">
          <MoneyInput
            name={`items.${index}.estimatedRate`}
            control={control}
            size="small"
            disabled={disabled}
            fullWidth
          />
        </TableCell>
        {canViewBoq ? (
          <TableCell>
            <BoqPicker
              projectId={projectId}
              control={control}
              index={index}
              disabled={disabled || !projectId}
            />
          </TableCell>
        ) : null}
        <TableCell align="right" data-testid={`pr-current-stock-${index}`}>
          {materialId ? (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
            >
              {stockQuery.isLoading ? (
                <CircularProgress size={14} />
              ) : null}
              <Typography variant="body2" color="text.secondary">
                {canViewStock
                  ? (currentStockDisplay ?? '—')
                  : 'Need stock.view'}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Button
            size="small"
            color="inherit"
            disabled={disabled || !canRemove}
            onClick={onRemove}
          >
            Remove
          </Button>
        </TableCell>
      </TableRow>
      {warnings.length > 0 ? (
        <TableRow>
          <TableCell
            colSpan={canViewBoq ? 8 : 7}
            sx={{ borderBottom: 0, pt: 0, pb: 1.5 }}
          >
            <Alert
              severity="warning"
              variant="outlined"
              data-testid={`pr-stock-warnings-${index}`}
            >
              {warnings.map((w) => (
                <Typography key={w} variant="caption" sx={{ display: 'block' }}>
                  {w}
                </Typography>
              ))}
            </Alert>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function MaterialPicker({
  value,
  cached,
  disabled,
  onChange,
}: {
  value: string;
  cached?: PublicMaterial;
  disabled: boolean;
  onChange: (material: PublicMaterial | null) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<PublicMaterial[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      void fetchMaterials({ search: inputValue, limit: 40 })
        .then((rows) => {
          if (!cancelled) setOptions(rows);
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [inputValue]);

  const selected =
    cached ?? options.find((m) => m.id === value) ?? null;

  return (
    <Autocomplete
      size="small"
      disabled={disabled}
      options={options}
      loading={loading}
      value={selected}
      inputValue={inputValue}
      onInputChange={(_, next, reason) => {
        if (reason === 'input' || reason === 'clear') {
          setInputValue(next);
        }
      }}
      onChange={(_, option) => onChange(option)}
      getOptionLabel={(m) => `${m.materialCode} — ${m.name}`}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Material"
          required
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress color="inherit" size={16} />
                  ) : null}
                  {params.slotProps.input?.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}

function BoqPicker({
  projectId,
  control,
  index,
  disabled,
}: {
  projectId: string | null;
  control: Control<PurchaseRequestFormValues>;
  index: number;
  disabled: boolean;
}) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<PublicBoqItemOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<Map<string, PublicBoqItemOption>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!projectId) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      void fetchBoqItems({
        projectId,
        search: inputValue,
        limit: 40,
      })
        .then((rows) => {
          if (cancelled) return;
          setOptions(rows);
          setCache((prev) => {
            const next = new Map(prev);
            for (const row of rows) next.set(row.id, row);
            return next;
          });
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [projectId, inputValue]);

  return (
    <Controller
      name={`items.${index}.boqItemId`}
      control={control}
      render={({ field }) => {
        const selected =
          field.value != null && field.value !== ''
            ? (cache.get(String(field.value)) ??
              options.find((o) => o.id === field.value) ?? {
                id: String(field.value),
                boqCode: String(field.value),
                description: '',
                status: '',
              })
            : null;

        return (
          <Autocomplete
            size="small"
            disabled={disabled}
            options={options}
            loading={loading}
            value={selected}
            inputValue={inputValue}
            onInputChange={(_, next, reason) => {
              if (reason === 'input' || reason === 'clear') {
                setInputValue(next);
              }
            }}
            onChange={(_, option) => {
              if (option) {
                setCache((prev) => new Map(prev).set(option.id, option));
              }
              field.onChange(option?.id ?? null);
            }}
            getOptionLabel={(o) =>
              o.description
                ? `${o.boqCode} — ${o.description}`
                : o.boqCode
            }
            isOptionEqualToValue={(a, b) => a.id === b.id}
            filterOptions={(x) => x}
            renderInput={(params) => (
              <TextField
                {...params}
                label="BOQ (optional)"
                slotProps={{
                  ...params.slotProps,
                  input: {
                    ...params.slotProps.input,
                    endAdornment: (
                      <>
                        {loading ? (
                          <CircularProgress color="inherit" size={16} />
                        ) : null}
                        {params.slotProps.input?.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
        );
      }}
    />
  );
}

function roundDisplay(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return String(Math.round(value * 1000) / 1000);
}
