import {
  MATERIAL_ISSUE_ISSUER_SIG_FIELD,
  MATERIAL_ISSUE_OFFLINE_TYPE,
  MATERIAL_ISSUE_RECIPIENT_SIG_FIELD,
} from '@/features/material-issue/buildMaterialIssueOfflineEnqueue';
import { mergeSiteExpenseAttachments } from '@/site-expenses/mergeSiteExpenseAttachments';
import { mergeStockCountItemPhotos } from '@/stock-count/mergeItemPhotos';

const SUBMIT_AFTER_TYPES = new Set([
  'stock_count.create_submit',
  'site_expense.create',
  'purchase_request.create',
  MATERIAL_ISSUE_OFFLINE_TYPE,
]);

/** True when sync should POST create then call a module submit endpoint. */
export function wantsSubmitAfterCreate(
  txnType: string,
  payload: Record<string, unknown>,
): boolean {
  if (txnType === 'stock_count.create_submit') return true;
  return SUBMIT_AFTER_TYPES.has(txnType) && payload.submitAfterCreate === true;
}

/** Strip offline-only flags before Nest create body. */
export function prepareCreateBody(
  txnType: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (
    txnType === 'stock_count.create_submit' ||
    txnType.startsWith('stock_count')
  ) {
    return mergeStockCountItemPhotos(payload);
  }
  if (txnType === 'site_expense.create') {
    return mergeSiteExpenseAttachments(payload);
  }
  if (txnType === MATERIAL_ISSUE_OFFLINE_TYPE) {
    const {
      submitAfterCreate: _s,
      offlineCapturedAt: _o,
      attachments: _a,
      clientTransactionId: _c,
      idempotencyKey: _i,
      recipientSignatureChecksum: _rc,
      issuerSignatureChecksum: _ic,
      [MATERIAL_ISSUE_RECIPIENT_SIG_FIELD]: _rs,
      [MATERIAL_ISSUE_ISSUER_SIG_FIELD]: _is,
      ...rest
    } = payload;
    return rest;
  }
  const { submitAfterCreate: _s, offlineCapturedAt: _o, ...rest } = payload;
  return rest;
}

export function submitAfterCreatePath(
  txnType: string,
  recordId: string,
): string | null {
  const id = encodeURIComponent(recordId);
  switch (txnType) {
    case 'stock_count.create_submit':
      return `/stock-counts/${id}/submit`;
    case 'site_expense.create':
      return `/site-expense-vouchers/${id}/submit`;
    case 'purchase_request.create':
      return `/purchase-requests/${id}/submit`;
    case MATERIAL_ISSUE_OFFLINE_TYPE:
      return `/material-issues/${id}/submit`;
    default:
      return null;
  }
}

/** Build attach-signatures body from offline sync payload (media fieldKeys + checksums). */
export function materialIssueSignaturesFromPayload(
  payload: Record<string, unknown>,
): {
  recipientSignatureDocumentId: string;
  recipientSignatureChecksum: string;
  issuerSignatureDocumentId?: string;
  issuerSignatureChecksum?: string;
} | null {
  const recipientDocId = String(
    payload[MATERIAL_ISSUE_RECIPIENT_SIG_FIELD] ?? '',
  ).trim();
  const recipientChecksum = String(
    payload.recipientSignatureChecksum ?? '',
  )
    .trim()
    .toLowerCase();
  if (!recipientDocId || !/^[a-f0-9]{64}$/.test(recipientChecksum)) {
    return null;
  }

  const issuerDocId = String(
    payload[MATERIAL_ISSUE_ISSUER_SIG_FIELD] ?? '',
  ).trim();
  const issuerChecksum = String(payload.issuerSignatureChecksum ?? '')
    .trim()
    .toLowerCase();

  const body: {
    recipientSignatureDocumentId: string;
    recipientSignatureChecksum: string;
    issuerSignatureDocumentId?: string;
    issuerSignatureChecksum?: string;
  } = {
    recipientSignatureDocumentId: recipientDocId,
    recipientSignatureChecksum: recipientChecksum,
  };

  if (issuerDocId && /^[a-f0-9]{64}$/.test(issuerChecksum)) {
    body.issuerSignatureDocumentId = issuerDocId;
    body.issuerSignatureChecksum = issuerChecksum;
  }

  return body;
}
