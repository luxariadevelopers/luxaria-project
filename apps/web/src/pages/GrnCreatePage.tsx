import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
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
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { createGoodsReceipt } from '@/grns/api';
import { resolveGrnCapabilities } from '@/grns/roleAccess';
import {
  fetchPurchaseOrder,
  fetchPurchaseOrders,
} from '@/purchase-orders/api';
import { PurchaseOrderStatus } from '@/purchase-orders/types';
import type { PublicPurchaseOrder } from '@/purchase-orders/types';

type LineDraft = {
  materialId: string;
  purchaseOrderLineId: string;
  materialLabel: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unit: string;
};

const DEFAULT_LAT = 13.0827;
const DEFAULT_LNG = 80.2707;

/**
 * Minimal goods-receipt create — `/inventory/grns/new`
 *
 * Nest: `POST /goods-receipts` (`grn.create`). Prefills lines from an issued /
 * partially received PO. GPS defaults to Chennai for back-office capture.
 */
export function GrnCreatePage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveGrnCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error: notifyError } = useNotify();

  const [poOptions, setPoOptions] = useState<PublicPurchaseOrder[]>([]);
  const [poLoading, setPoLoading] = useState(false);
  const [purchaseOrderId, setPurchaseOrderId] = useState(
    searchParams.get('purchaseOrderId') ?? '',
  );
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const projectLabel = selectedProject
    ? selectedProject.projectCode
      ? `${selectedProject.projectCode} · ${selectedProject.projectName}`
      : selectedProject.projectName
    : selectedProjectId;

  useEffect(() => {
    if (!selectedProjectId || !caps.canCreate || !caps.canViewPurchaseOrder) {
      return;
    }
    let cancelled = false;
    setPoLoading(true);
    void Promise.all([
      fetchPurchaseOrders({
        projectId: selectedProjectId,
        status: PurchaseOrderStatus.Issued,
        page: 1,
        limit: 50,
      }),
      fetchPurchaseOrders({
        projectId: selectedProjectId,
        status: PurchaseOrderStatus.PartiallyReceived,
        page: 1,
        limit: 50,
      }),
    ])
      .then(([issued, partial]) => {
        if (cancelled) return;
        const byId = new Map<string, PublicPurchaseOrder>();
        for (const row of [...issued.items, ...partial.items]) {
          byId.set(row.id, row);
        }
        setPoOptions([...byId.values()]);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(getErrorMessage(err, 'Could not load purchase orders'));
        }
      })
      .finally(() => {
        if (!cancelled) setPoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, caps.canCreate, caps.canViewPurchaseOrder]);

  useEffect(() => {
    if (!purchaseOrderId) {
      setLines([]);
      return;
    }
    let cancelled = false;
    void fetchPurchaseOrder(purchaseOrderId)
      .then((po) => {
        if (cancelled) return;
        setLines(
          po.items
            .filter((item) => item.balanceQuantity > 0)
            .map((item) => ({
              materialId: item.materialId,
              purchaseOrderLineId: item.id,
              materialLabel:
                [item.materialCode, item.materialName]
                  .filter(Boolean)
                  .join(' — ') || item.materialId,
              orderedQuantity: item.quantity,
              receivedQuantity: item.balanceQuantity,
              unit: String(item.unit),
            })),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          notifyError(getErrorMessage(err, 'Could not load purchase order'));
          setLines([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [purchaseOrderId, notifyError]);

  const canSubmit = useMemo(
    () =>
      Boolean(selectedProjectId) &&
      Boolean(purchaseOrderId) &&
      lines.length > 0 &&
      lines.every((line) => line.receivedQuantity > 0) &&
      Boolean(receivedDate),
    [selectedProjectId, purchaseOrderId, lines, receivedDate],
  );

  if (access && !caps.canCreate) {
    return (
      <PermissionDenied
        title="Cannot create goods receipt"
        message="You need grn.create to capture goods receipts."
      />
    );
  }

  if (access && !selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header before creating a goods receipt."
      />
    );
  }

  const persist = async (submit: boolean) => {
    if (!selectedProjectId || !purchaseOrderId) return;
    setSaving(true);
    try {
      const created = await createGoodsReceipt({
        projectId: selectedProjectId,
        purchaseOrderId,
        receivedDate,
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LNG,
        photos: ['e2e-grn.jpg'],
        submit,
        items: lines.map((line) => ({
          materialId: line.materialId,
          purchaseOrderLineId: line.purchaseOrderLineId,
          orderedQuantity: line.orderedQuantity,
          receivedQuantity: line.receivedQuantity,
          unit: line.unit,
        })),
      });
      success(
        submit
          ? `GRN ${created.grnNumber} submitted`
          : `Draft GRN ${created.grnNumber} saved`,
      );
      navigate(`/inventory/grns/${created.id}`);
    } catch (err) {
      if (isForbiddenError(err)) {
        notifyError(getErrorMessage(err));
      } else {
        notifyError(getErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2.5} data-testid="grn-create-page">
      <Typography color="text.secondary">
        Capture an inbound goods receipt for {projectLabel}. Lines are loaded
        from the selected purchase order; GPS defaults for back-office entry.
      </Typography>

      {loadError ? <Alert severity="error">{loadError}</Alert> : null}

      <FormControl size="small" fullWidth required>
        <InputLabel id="grn-po">Purchase order</InputLabel>
        <Select
          labelId="grn-po"
          label="Purchase order"
          value={purchaseOrderId}
          data-testid="grn-po-select"
          disabled={poLoading || saving}
          onChange={(e) => setPurchaseOrderId(String(e.target.value))}
        >
          {poOptions.map((po) => (
            <MenuItem key={po.id} value={po.id}>
              {po.purchaseOrderNumber} · {po.status}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Received date"
        type="date"
        size="small"
        fullWidth
        required
        value={receivedDate}
        disabled={saving}
        onChange={(e) => setReceivedDate(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      {purchaseOrderId && lines.length === 0 ? (
        <Alert severity="info" variant="outlined">
          No open balance lines on this purchase order.
        </Alert>
      ) : null}

      {lines.length > 0 ? (
        <Table size="small" data-testid="grn-create-lines">
          <TableHead>
            <TableRow>
              <TableCell>Material</TableCell>
              <TableCell align="right">Ordered</TableCell>
              <TableCell align="right">Receive qty</TableCell>
              <TableCell>Unit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.purchaseOrderLineId}>
                <TableCell>{line.materialLabel}</TableCell>
                <TableCell align="right">{line.orderedQuantity}</TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    size="small"
                    value={line.receivedQuantity}
                    disabled={saving}
                    inputProps={{ min: 0, step: 'any' }}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setLines((prev) =>
                        prev.map((row) =>
                          row.purchaseOrderLineId === line.purchaseOrderLineId
                            ? {
                                ...row,
                                receivedQuantity: Number.isFinite(next)
                                  ? next
                                  : 0,
                              }
                            : row,
                        ),
                      );
                    }}
                  />
                </TableCell>
                <TableCell>{line.unit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
        <Button
          onClick={() => navigate('/inventory/grns')}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="outlined"
          disabled={!canSubmit || saving}
          onClick={() => void persist(false)}
        >
          {saving ? 'Saving…' : 'Save draft'}
        </Button>
        <Button
          variant="contained"
          disabled={!canSubmit || saving}
          data-testid="grn-create-submit"
          onClick={() => void persist(true)}
        >
          {saving ? 'Submitting…' : 'Save & submit'}
        </Button>
      </Stack>
    </Stack>
  );
}
