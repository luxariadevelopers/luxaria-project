import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
  Autocomplete,
  Button,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { fetchMaterials } from '@/purchase-requests/api';
import type { PublicMaterial } from '@/purchase-requests/types';
import { createStockTransfer } from './api';
import {
  STOCK_TRANSFER_SCOPE_OPTIONS,
  materialUnitLabel,
  stockTransferScopeLabel,
} from './labels';
import {
  StockTransferScope,
  type CreateStockTransferItemInput,
  type MaterialUnit,
  type StockTransfer,
} from './types';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onCreated: (row: StockTransfer) => void;
};

type LineDraft = {
  key: string;
  material: PublicMaterial | null;
  unit: MaterialUnit | '';
  quantity: string;
};

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

let rowSeq = 0;
function nextKey(): string {
  rowSeq += 1;
  return `line-${rowSeq}`;
}

function emptyLine(): LineDraft {
  return { key: nextKey(), material: null, unit: '', quantity: '' };
}

export function CreateStockTransferDrawer({
  open,
  onClose,
  projectId,
  onCreated,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const { projects } = useProject();
  const create = useMutation({
    mutationFn: createStockTransfer,
  });

  const [scope, setScope] = useState<StockTransferScope>(
    StockTransferScope.WarehouseToWarehouse,
  );
  const [destProjectId, setDestProjectId] = useState(projectId);
  const [transferDate, setTransferDate] = useState(todayDateOnly);
  const [sourceLocation, setSourceLocation] = useState('');
  const [destLocation, setDestLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [materialOptions, setMaterialOptions] = useState<PublicMaterial[]>([]);
  const [materialLoading, setMaterialLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDestProjectId(projectId);
  }, [open, projectId]);

  const reset = () => {
    setScope(StockTransferScope.WarehouseToWarehouse);
    setDestProjectId(projectId);
    setTransferDate(todayDateOnly());
    setSourceLocation('');
    setDestLocation('');
    setNotes('');
    setLines([emptyLine()]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const searchMaterials = async (input: string) => {
    setMaterialLoading(true);
    try {
      const list = await fetchMaterials({ search: input, limit: 40 });
      setMaterialOptions(list);
    } catch (err) {
      notifyError(getErrorMessage(err));
    } finally {
      setMaterialLoading(false);
    }
  };

  const unitOptionsFor = (material: PublicMaterial | null): MaterialUnit[] => {
    if (!material) return [];
    return [
      ...new Set<MaterialUnit>([
        material.baseUnit as MaterialUnit,
        ...((material.alternateUnits ?? []) as MaterialUnit[]),
      ]),
    ];
  };

  const projectOptions = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        label: `${p.projectCode} · ${p.projectName}`,
      })),
    [projects],
  );

  const parsedItems = useMemo(() => {
    const items: CreateStockTransferItemInput[] = [];
    for (const line of lines) {
      if (!line.material || !line.unit) continue;
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      items.push({
        materialId: line.material.id,
        unit: line.unit,
        quantity: qty,
      });
    }
    return items;
  }, [lines]);

  const canSubmit =
    sourceLocation.trim().length > 0 &&
    destLocation.trim().length > 0 &&
    Boolean(destProjectId) &&
    Boolean(transferDate) &&
    parsedItems.length > 0 &&
    !create.isPending;

  const submit = () => {
    if (!canSubmit) return;
    void (async () => {
      try {
        const row = await create.mutateAsync({
          scope,
          sourceProjectId: projectId,
          destProjectId:
            scope === StockTransferScope.ProjectToProject
              ? destProjectId
              : projectId,
          sourceLocation: sourceLocation.trim(),
          destLocation: destLocation.trim(),
          transferDate,
          items: parsedItems,
          notes: notes.trim() || null,
        });
        success(`Transfer ${row.transferNumber} created`);
        handleClose();
        onCreated(row);
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 480 }, p: 2.5 } },
      }}
    >
      <Stack spacing={2} data-testid="create-stock-transfer-drawer">
        <Typography variant="h6">New stock transfer</Typography>
        <Typography variant="body2" color="text.secondary">
          Creates a draft. Posting moves quantity out of the source location and
          into the destination on the stock ledger.
        </Typography>

        <FormControl fullWidth required>
          <InputLabel id="transfer-scope-label">Scope</InputLabel>
          <Select
            labelId="transfer-scope-label"
            label="Scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as StockTransferScope)}
          >
            {STOCK_TRANSFER_SCOPE_OPTIONS.map((value) => (
              <MenuItem key={value} value={value}>
                {stockTransferScopeLabel(value)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {scope === StockTransferScope.ProjectToProject ? (
          <FormControl fullWidth required>
            <InputLabel id="transfer-dest-project-label">
              Destination project
            </InputLabel>
            <Select
              labelId="transfer-dest-project-label"
              label="Destination project"
              value={destProjectId}
              onChange={(e) => setDestProjectId(e.target.value)}
            >
              {projectOptions.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}

        <TextField
          label="Transfer date"
          type="date"
          required
          value={transferDate}
          onChange={(e) => setTransferDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <TextField
          label="Source location"
          required
          value={sourceLocation}
          onChange={(e) => setSourceLocation(e.target.value)}
          helperText="Balance location key (warehouse / bin / site path)"
        />

        <TextField
          label="Destination location"
          required
          value={destLocation}
          onChange={(e) => setDestLocation(e.target.value)}
        />

        <Typography variant="subtitle2">Line items</Typography>
        {lines.map((line, index) => {
          const units = unitOptionsFor(line.material);
          return (
            <Stack
              key={line.key}
              spacing={1.5}
              sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}
            >
              <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography variant="body2">Line {index + 1}</Typography>
                {lines.length > 1 ? (
                  <IconButton
                    size="small"
                    aria-label="Remove line"
                    onClick={() =>
                      setLines((prev) => prev.filter((l) => l.key !== line.key))
                    }
                  >
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </Stack>

              <Autocomplete
                options={materialOptions}
                loading={materialLoading}
                value={line.material}
                onOpen={() => void searchMaterials('')}
                onInputChange={(_e, value, reason) => {
                  if (reason === 'input') void searchMaterials(value);
                }}
                onChange={(_e, value) => {
                  setLines((prev) =>
                    prev.map((l) =>
                      l.key === line.key
                        ? {
                            ...l,
                            material: value,
                            unit: value
                              ? (value.baseUnit as MaterialUnit)
                              : '',
                          }
                        : l,
                    ),
                  );
                }}
                getOptionLabel={(opt) => `${opt.materialCode} · ${opt.name}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => (
                  <TextField {...params} label="Material" required />
                )}
              />

              <FormControl fullWidth required disabled={!line.material}>
                <InputLabel id={`transfer-unit-${line.key}`}>Unit</InputLabel>
                <Select
                  labelId={`transfer-unit-${line.key}`}
                  label="Unit"
                  value={line.unit}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key
                          ? { ...l, unit: e.target.value as MaterialUnit }
                          : l,
                      ),
                    )
                  }
                >
                  {units.map((u) => (
                    <MenuItem key={u} value={u}>
                      {materialUnitLabel(u)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Quantity"
                type="number"
                required
                value={line.quantity}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l) =>
                      l.key === line.key
                        ? { ...l, quantity: e.target.value }
                        : l,
                    ),
                  )
                }
                slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              />
            </Stack>
          );
        })}

        <Button
          variant="outlined"
          onClick={() => setLines((p) => [...p, emptyLine()])}
        >
          Add line
        </Button>

        <TextField
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={2}
        />

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!canSubmit} onClick={submit}>
            {create.isPending ? 'Creating…' : 'Create draft'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
