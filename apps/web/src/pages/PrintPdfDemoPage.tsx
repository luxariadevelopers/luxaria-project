import { useMemo, useState } from 'react';
import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  PurchaseOrderStatus,
  SignedPaymentVoucherStatus,
} from '@luxaria/shared-types';
import { useAuth } from '@/auth/AuthContext';
import {
  DocumentActionMenu,
  accountingReportPdfSource,
  customerReceiptPdfSource,
  dprPdfSource,
  goodsReceiptPdfSource,
  purchaseOrderPdfSource,
  signedPaymentVoucherPdfSource,
} from '@/print-pdf';

type DemoKind =
  | 'voucher'
  | 'purchase-order'
  | 'grn'
  | 'receipt'
  | 'dpr'
  | 'report';

/**
 * Dev-only print/PDF framework demo (Micro Phase 019). Not in the sidebar.
 */
export function PrintPdfDemoPage() {
  const { hasPermission } = useAuth();
  const [kind, setKind] = useState<DemoKind>('voucher');
  const [entityId, setEntityId] = useState('507f1f77bcf86cd799439011');
  const [documentId, setDocumentId] = useState('507f1f77bcf86cd799439012');
  const [status, setStatus] = useState<string>(
    SignedPaymentVoucherStatus.Approved,
  );

  const source = useMemo(() => {
    switch (kind) {
      case 'voucher':
        return signedPaymentVoucherPdfSource({
          voucherPdfDocumentId: documentId || null,
          status,
        });
      case 'purchase-order':
        return purchaseOrderPdfSource({
          id: entityId,
          pdfPath: null,
          status: status || PurchaseOrderStatus.Issued,
        });
      case 'grn':
        return goodsReceiptPdfSource({
          photos: [],
          challanDocument: documentId || null,
          weighbridgeDocument: null,
        });
      case 'receipt':
        return customerReceiptPdfSource({
          id: entityId,
          receiptPdfPath: null,
          status: status || 'posted',
        });
      case 'dpr':
        return dprPdfSource({
          id: entityId,
          pdfDocumentId: documentId || null,
          status: status || 'submitted',
        });
      case 'report':
        return accountingReportPdfSource({
          reportType: 'trial-balance',
          query: {},
        });
      default: {
        const _exhaustive: never = kind;
        return _exhaustive;
      }
    }
  }, [kind, entityId, documentId, status]);

  const canViewEntity = useMemo(() => {
    switch (kind) {
      case 'voucher':
        return hasPermission('payment.view');
      case 'purchase-order':
        return hasPermission('purchase.view');
      case 'grn':
        return hasPermission('grn.create');
      case 'receipt':
        return hasPermission('collection.view');
      case 'dpr':
        return hasPermission('dpr.view');
      case 'report':
        return hasPermission('report.view') || hasPermission('report.export');
      default:
        return false;
    }
  }, [kind, hasPermission]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Print / PDF actions demo</Typography>
      <Typography color="text.secondary">
        Reusable <code>DocumentActionMenu</code> for backend PDFs. Open{' '}
        <code>/dev/print-pdf</code> (no menu item).
      </Typography>

      <Alert severity="info" variant="outlined">
        Uses live APIs when ids exist in your environment. Path-based PO/receipt
        PDFs need <code>VITE_UPLOADS_BASE_URL</code> or a reverse-proxy for{' '}
        <code>/uploads</code>. Document-backed sources need{' '}
        <code>document.download</code>.
      </Alert>

      <FormControl sx={{ maxWidth: 320 }}>
        <InputLabel id="pdf-kind-label">Document kind</InputLabel>
        <Select
          labelId="pdf-kind-label"
          label="Document kind"
          value={kind}
          onChange={(e) => {
            const next = e.target.value as DemoKind;
            setKind(next);
            if (next === 'voucher') {
              setStatus(SignedPaymentVoucherStatus.Approved);
            } else if (next === 'purchase-order') {
              setStatus(PurchaseOrderStatus.Issued);
            } else if (next === 'receipt') {
              setStatus('posted');
            } else if (next === 'dpr') {
              setStatus('submitted');
            }
          }}
        >
          <MenuItem value="voucher">Signed payment voucher</MenuItem>
          <MenuItem value="purchase-order">Purchase order</MenuItem>
          <MenuItem value="grn">Goods receipt (attachments)</MenuItem>
          <MenuItem value="receipt">Customer receipt</MenuItem>
          <MenuItem value="dpr">Daily progress report</MenuItem>
          <MenuItem value="report">Accounting report (trial-balance)</MenuItem>
        </Select>
      </FormControl>

      {kind !== 'report' ? (
        <TextField
          label="Entity id"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value.trim())}
          sx={{ maxWidth: 420 }}
        />
      ) : null}

      {kind === 'voucher' || kind === 'grn' || kind === 'dpr' ? (
        <TextField
          label="Document id (Mongo ObjectId)"
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value.trim())}
          sx={{ maxWidth: 420 }}
        />
      ) : null}

      {kind !== 'report' && kind !== 'grn' ? (
        <TextField
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value.trim())}
          helperText="Must match backend status enums"
          sx={{ maxWidth: 320 }}
        />
      ) : null}

      <DocumentActionMenu source={source} canViewEntity={canViewEntity} />
    </Stack>
  );
}
