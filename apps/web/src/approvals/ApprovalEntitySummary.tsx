import { SummaryCards, type EntitySummaryField } from '@/components/entity-detail';
import { formatDateTime, formatInr } from '@/format';
import type { PublicApprovalRequest } from './types';

type Props = {
  approval: PublicApprovalRequest;
};

export function ApprovalEntitySummary({ approval }: Props) {
  const fields: EntitySummaryField[] = [
    { id: 'amount', label: 'Amount', value: formatInr(approval.amount) },
    {
      id: 'step',
      label: 'Current step',
      value: String(approval.currentStep),
    },
    {
      id: 'entity',
      label: 'Entity',
      value: `${approval.entityType} · ${approval.entityId}`,
    },
    {
      id: 'requestedAt',
      label: 'Requested',
      value: formatDateTime(approval.requestedAt),
    },
    {
      id: 'stepEnteredAt',
      label: 'Step entered',
      value: approval.stepEnteredAt
        ? formatDateTime(approval.stepEnteredAt)
        : '—',
    },
    {
      id: 'requestedBy',
      label: 'Requested by',
      value: approval.requestedBy,
    },
    {
      id: 'escalated',
      label: 'Escalated',
      value: approval.escalated ? 'Yes' : 'No',
    },
    {
      id: 'workflow',
      label: 'Workflow',
      value: approval.workflowId,
    },
  ];

  return <SummaryCards title="Entity summary" fields={fields} />;
}
