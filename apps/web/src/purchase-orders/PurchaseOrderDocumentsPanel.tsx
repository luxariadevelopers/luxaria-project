import { Alert, Stack, Typography } from '@mui/material';
import { DocumentListPanel, DocumentUploadPanel } from '@/documents';
import { DocumentActionMenu } from '@/print-pdf';
import { purchaseOrderPdfSource } from '@/print-pdf/sources';
import type { PublicPurchaseOrder } from './types';

type Props = {
  po: PublicPurchaseOrder;
  canView: boolean;
};

/**
 * Documents + PO PDF. Upload uses generic documents module
 * (`entityType: purchase_order`); Nest PDF is `POST /:id/export-pdf`.
 */
export function PurchaseOrderDocumentsPanel({ po, canView }: Props) {
  const pdfSource = purchaseOrderPdfSource({
    id: po.id,
    pdfPath: po.pdfPath,
    status: po.status,
  });

  return (
    <Stack spacing={2} data-testid="po-documents-panel">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Typography variant="subtitle1">Documents & PDF</Typography>
        <DocumentActionMenu source={pdfSource} canViewEntity={canView} />
      </Stack>

      {po.pdfPath ? (
        <Alert severity="info" variant="outlined">
          Last generated PDF path: {po.pdfPath}
          {po.pdfGeneratedAt ? ` · ${po.pdfGeneratedAt}` : ''}
        </Alert>
      ) : null}

      <DocumentListPanel
        entityType="purchase_order"
        entityId={po.id}
        module="purchase"
        projectId={po.projectId}
        title="Attached documents"
      />

      <DocumentUploadPanel
        title="Upload attachment"
        context={{
          module: 'purchase',
          entityType: 'purchase_order',
          entityId: po.id,
          projectId: po.projectId,
          documentType: 'purchase_order_attachment',
        }}
      />
    </Stack>
  );
}
