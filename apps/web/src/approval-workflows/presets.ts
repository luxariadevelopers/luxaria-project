import type { WorkflowPreset } from './types';

/**
 * Known module/entity pairs seeded or used by Nest modules.
 * Free-text module/entityType is still supported for custom workflows.
 */
export const APPROVAL_WORKFLOW_PRESETS: readonly WorkflowPreset[] = [
  {
    label: 'Purchase order',
    module: 'procurement',
    entityType: 'purchase_order',
  },
  {
    label: 'Quotation comparison',
    module: 'procurement',
    entityType: 'quotation_comparison',
  },
  {
    label: 'Booking discount',
    module: 'sales',
    entityType: 'booking_discount',
  },
  {
    label: 'Payment schedule',
    module: 'sales',
    entityType: 'payment_schedule',
  },
  {
    label: 'Booking cancellation',
    module: 'sales',
    entityType: 'booking_cancellation',
  },
  {
    label: 'Contractor agreement',
    module: 'contractors',
    entityType: 'contractor_agreement',
  },
  {
    label: 'Petty cash weekly requirement',
    module: 'petty_cash',
    entityType: 'weekly_requirement',
  },
] as const;
