/**
 * Canonical permission codes: module.action
 * Deny by default — callers must grant explicitly (except Super Admin bypass).
 */
export const PERMISSIONS = [
  // System / RBAC
  'role.view',
  'role.create',
  'role.update',
  'role.assign',
  'permission.view',
  'user.view',
  'user.create',
  'user.update',
  'user.activate',
  'user.deactivate',
  'user.delete',
  'user.reset_password',
  'user.assign_role',
  'user.assign_project',
  'session.revoke',

  // Employees / org structure (enterprise IAM)
  'employee.view',
  'employee.create',
  'employee.update',
  'employee.deactivate',
  'department.view',
  'department.manage',
  'designation.view',
  'designation.manage',
  'permission.override.manage',

  // Sites / site access
  'site.view',
  'site.manage',
  'site_access.view',
  'site_access.assign',
  'site_access.manage',

  // Company / masters
  'company.view',
  'company.update',
  'company.upload_logo',
  'financial_year.view',
  'financial_year.manage',
  'financial_year.unlock',
  'period_closure.view',
  'period_closure.manage',
  'period_closure.reopen',
  'period_closure.approve_reopen',

  // Projects
  // Phase 2 PLM: archive reuses project.close; clone reuses project.create
  // (no separate project.archive / project.clone permission codes).
  'project.view',
  'project.create',
  'project.update',
  'project.close',
  'project.upload_document',
  'project_access.view',
  'project_access.assign',
  'project_access.manage',
  'project_access.audit_view',

  // Directors & company shareholding (separate from project investment)
  'director.view',
  'director.create',
  'director.update',
  'director.upload_document',
  'shareholding.view',
  'shareholding.propose',
  'shareholding.approve',

  // Investor master (separate from company shareholding & project investment postings)
  'investor.view',
  'investor.view_all',
  'investor.create',
  'investor.update',
  'investor.verify_kyc',
  'investor.activate',
  'investor.upload_document',

  // Project participants & project profit share (independent of company shareholding)
  'project_participant.view',
  'project_participant.create',
  'project_participant.update',
  'project_participant.submit',
  'project_participant.approve',
  'project_participant.finalize',
  'project_participant.upload_document',

  // Project contribution commitments
  'contribution_commitment.view',
  'contribution_commitment.create',
  'contribution_commitment.submit',
  'contribution_commitment.approve',
  'contribution_commitment.amend',
  'contribution_commitment.cancel',
  'contribution_commitment.record_receipt',

  // Contribution receipts (posted amounts; accounting entries later)
  'contribution_receipt.view',
  'contribution_receipt.create',
  'contribution_receipt.submit',
  'contribution_receipt.verify',
  'contribution_receipt.post',
  'contribution_receipt.cancel',
  'contribution_receipt.upload_document',

  // Project investments (not company shareholding)
  'investment.view',
  'investment.create',
  'investment.approve',

  // Restricted investor portal (own authorised projects only)
  'investor_portal.view',
  'investor_portal.manage',

  // Accounting
  'account.view',
  'account.manage',
  'journal.view',
  'journal.create',
  'journal.post',
  'journal.reverse',
  'bank.view',
  'bank.manage',
  'bank.view_sensitive',
  'bank_reconciliation.view',
  'bank_reconciliation.manage',
  'bank_reconciliation.import',
  'bank_reconciliation.match',
  'bank_reconciliation.post',
  'cash.view',
  'cash.manage',

  // Expenses / petty cash
  'expense_category.view',
  'expense_category.manage',
  'expense.view',
  'expense.create',
  'expense.approve',
  'expense.post',
  'petty_cash.view',
  'petty_cash.request',
  'petty_cash.approve',
  'petty_cash.fund',

  // Procurement / stock
  'vendor.view',
  'vendor.manage',
  'material.view',
  'material.manage',
  'material_consumption.view',
  'material_consumption.manage',
  'material_consumption.approve',
  'purchase.view',
  'purchase.request',
  'purchase.approve',
  'purchase.order',
  'procurement_master.view',
  'procurement_master.manage',
  'quotation.view',
  'quotation.manage',
  'quotation.finalize',
  'quotation.compare',
  'quotation.recommend',
  'grn.create',
  'grn.approve',
  'vendor_portal.view',
  'vendor_portal.respond',
  'quality.view',
  'quality.inspect',
  'vendor_invoice.view',
  'vendor_invoice.create',
  'vendor_invoice.verify',
  'vendor_invoice.match',
  'vendor_invoice.approve',
  'vendor_invoice.post',
  'stock.view',
  'stock.adjust',
  'stock.issue',
  'stock.transfer',
  'stock.reserve',
  'stock.barcode',
  'stock.count.director_approve',
  'payment.view',
  'payment.release',
  'payment.approve',

  // BOQ / progress
  'boq.view',
  'boq.manage',
  'boq.approve',
  'dpr.view',
  'dpr.create',
  'dpr.review',
  'measurement.view',
  'measurement.create',
  'measurement.certify',

  // Labour / contractors
  'contractor.view',
  'contractor.manage',
  'contractor_agreement.view',
  'contractor_agreement.manage',
  'contractor_agreement.approve',
  'labour_category.view',
  'labour_category.manage',
  'attendance.view',
  'attendance.create',
  'attendance.confirm',
  'manpower_plan.view',
  'manpower_plan.manage',
  'manpower_shortfall.view',
  'manpower_shortfall.acknowledge',
  'running_bill.view',
  'running_bill.create',
  'running_bill.verify',
  'running_bill.certify',
  'running_bill.finance_verify',
  'running_bill.approve',
  'running_bill.post',
  'running_bill.pay',

  // Sales
  'unit.view',
  'unit.manage',
  'customer.view',
  'customer.manage',
  'booking.view',
  'booking.create',
  'booking.approve',
  'booking.cancel',
  'collection.view',
  'collection.create',
  'collection.approve',
  'collection.refund',

  // Documents / approvals / reports (S3 private bucket)
  'document.view',
  'document.upload',
  'document.download',
  'document.replace',
  'document.archive',
  'approval.view',
  'approval.act',
  'approval.configure',
  'approval.cancel',
  'report.view',
  'report.export',
  'audit.view',
  'dashboard.view',

  // Notifications (in-app / push / email / WhatsApp)
  'notification.view',
  'notification.send',
  'notification.manage',

  // Daily director digest
  'director_digest.view',
  'director_digest.send',
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number] | (string & {});

export function isKnownPermission(code: string): boolean {
  return (PERMISSIONS as readonly string[]).includes(code);
}

export const SUPER_ADMIN_ROLE_CODE = 'SUPER_ADMIN';
