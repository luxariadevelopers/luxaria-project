import {
  Alert,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { AcceptLineDraft } from './validation';
import { validateAcceptLine } from './validation';
import type { PublicGoodsReceiptItem } from './types';

type Props = {
  items: readonly PublicGoodsReceiptItem[];
  drafts: AcceptLineDraft[];
  onChange: (next: AcceptLineDraft[]) => void;
  editable: boolean;
};

function materialLabel(item: PublicGoodsReceiptItem): string {
  if (item.materialCode && item.materialName) {
    return `${item.materialCode} · ${item.materialName}`;
  }
  return item.materialName || item.materialCode || item.materialId;
}

/**
 * Line-level QC acceptance. Enforces accepted + rejected ≤ received;
 * Nest accept still requires equality (see validation helpers).
 */
export function GrnItemAcceptancePanel({
  items,
  drafts,
  onChange,
  editable,
}: Props) {
  const byId = new Map(items.map((item) => [item.id, item]));

  const updateLine = (
    lineId: string,
    patch: Partial<AcceptLineDraft>,
  ) => {
    onChange(
      drafts.map((draft) =>
        draft.lineId === lineId ? { ...draft, ...patch } : draft,
      ),
    );
  };

  const fillRemainingAsAccepted = () => {
    onChange(
      drafts.map((draft) => {
        const rejected = Math.max(0, Number(draft.rejectedQuantity) || 0);
        const remaining = Math.max(
          0,
          draft.receivedQuantity - rejected,
        );
        return {
          ...draft,
          acceptedQuantity: remaining,
          rejectionReason:
            rejected > 0 ? draft.rejectionReason : '',
        };
      }),
    );
  };

  if (!editable) {
    return (
      <Table size="small" data-testid="grn-items-readonly">
        <TableHead>
          <TableRow>
            <TableCell>Material</TableCell>
            <TableCell align="right">Ordered</TableCell>
            <TableCell align="right">Received</TableCell>
            <TableCell align="right">Accepted</TableCell>
            <TableCell align="right">Rejected</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>Unit</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{materialLabel(item)}</TableCell>
              <TableCell align="right">{item.orderedQuantity}</TableCell>
              <TableCell align="right">{item.receivedQuantity}</TableCell>
              <TableCell align="right">
                {item.acceptedQuantity ?? '—'}
              </TableCell>
              <TableCell align="right">
                {item.rejectedQuantity ?? '—'}
              </TableCell>
              <TableCell>{item.rejectionReason ?? '—'}</TableCell>
              <TableCell>{item.unit}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Stack spacing={1.5} data-testid="grn-item-acceptance">
      <Stack
        direction="row"
        useFlexGap
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Accepted + rejected must not exceed received. Nest requires the
          sum to equal received before accept.
        </Typography>
        <Button size="small" variant="outlined" onClick={fillRemainingAsAccepted}>
          Fill remaining as accepted
        </Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Material</TableCell>
            <TableCell align="right">Received</TableCell>
            <TableCell align="right">Accepted</TableCell>
            <TableCell align="right">Rejected</TableCell>
            <TableCell>Rejection reason</TableCell>
            <TableCell>Check</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {drafts.map((draft) => {
            const item = byId.get(draft.lineId);
            const check = validateAcceptLine(draft);
            return (
              <TableRow key={draft.lineId}>
                <TableCell>
                  {item ? materialLabel(item) : draft.lineId}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block' }}
                  >
                    {item?.unit ?? ''}
                  </Typography>
                </TableCell>
                <TableCell align="right">{draft.receivedQuantity}</TableCell>
                <TableCell align="right" sx={{ minWidth: 110 }}>
                  <TextField
                    size="small"
                    type="number"
                    value={draft.acceptedQuantity}
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                    onChange={(e) =>
                      updateLine(draft.lineId, {
                        acceptedQuantity: Number(e.target.value),
                      })
                    }
                  />
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 110 }}>
                  <TextField
                    size="small"
                    type="number"
                    value={draft.rejectedQuantity}
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                    onChange={(e) =>
                      updateLine(draft.lineId, {
                        rejectedQuantity: Number(e.target.value),
                      })
                    }
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={draft.rejectionReason ?? ''}
                    disabled={Number(draft.rejectedQuantity) <= 0}
                    onChange={(e) =>
                      updateLine(draft.lineId, {
                        rejectionReason: e.target.value,
                      })
                    }
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 160 }}>
                  {check.ok ? (
                    <Typography variant="caption" color="success.main">
                      Ready
                    </Typography>
                  ) : (
                    <Alert severity="warning" sx={{ py: 0, px: 1 }}>
                      <Typography variant="caption">
                        {check.messages[0] ??
                          (check.underAllocated
                            ? 'Allocate remaining qty'
                            : 'Invalid')}
                      </Typography>
                    </Alert>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Stack>
  );
}
