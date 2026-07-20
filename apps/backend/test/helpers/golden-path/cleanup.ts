import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { GOLDEN_PATH_IDS, oid } from './seed-ids';

const PROJECT_SCOPED_COLLECTIONS = [
  'purchase_requests',
  'vendor_quotations',
  'purchase_orders',
  'goods_receipts',
  'vendor_invoices',
  'vendor_payments',
  'contractor_bills',
  'contractor_payments',
  'work_measurements',
  'contractor_agreements',
  'petty_cash_requirements',
  'petty_cash_expense_drafts',
  'petty_cash_fund_transfers',
  'site_expense_vouchers',
  'bookings',
  'payment_schedules',
  'payment_demands',
  'customer_receipts',
  'contribution_receipts',
  'contribution_commitments',
  'project_participants',
  'project_contribution_balances',
  'participant_contribution_balances',
  'cash_accounts',
  'approval_requests',
  'approval_histories',
  'journal_entries',
  'material_stock_balances',
  'material_stock_transactions',
] as const;

/**
 * Removes golden-path entities for the seeded project between scenarios.
 */
export async function cleanupGoldenPathProjectData(
  app: INestApplication,
): Promise<void> {
  const connection = app.get<Connection>(getConnectionToken());
  const projectOid = oid(GOLDEN_PATH_IDS.project);

  await Promise.all(
    PROJECT_SCOPED_COLLECTIONS.map((name) =>
      connection.collection(name).deleteMany({ projectId: projectOid }),
    ),
  );

  await connection.collection('units').updateOne(
    { _id: oid(GOLDEN_PATH_IDS.unit) },
    { $set: { status: 'available', bookingRefId: null } },
  );
  await connection.collection('counters').deleteMany({
    key: {
      $regex:
        /^GP-|PCR-|PR-|PO-|GRN-|VI-|VP-|CR-|SEV-|BK-|CTR-|COM-|JE-|CB-|CP-/,
    },
  });
}
