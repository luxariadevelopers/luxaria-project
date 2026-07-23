import type { TenderCapabilities } from './roleAccess';
import type {
  ContractorTenderStatus,
  PublicContractorTender,
} from './api';

export type TenderListActionId =
  | 'invite'
  | 'record_bid'
  | 'compare'
  | 'cancel';

export function canCompareTender(status: ContractorTenderStatus): boolean {
  return (
    status === 'bidding' ||
    status === 'under_evaluation' ||
    status === 'awarded'
  );
}

export function canRecordTenderBid(status: ContractorTenderStatus): boolean {
  return status === 'invited' || status === 'bidding';
}

export function resolveTenderListActions(
  row: PublicContractorTender,
  caps: TenderCapabilities,
): TenderListActionId[] {
  const actions: TenderListActionId[] = [];

  if (
    caps.canManage &&
    (row.status === 'draft' || row.status === 'invited')
  ) {
    actions.push('invite');
  }

  /** Nest `POST …/bids` — invited / bidding (`tender.manage`). */
  if (caps.canManage && canRecordTenderBid(row.status)) {
    actions.push('record_bid');
  }

  if (caps.canView && canCompareTender(row.status)) {
    actions.push('compare');
  }

  if (
    caps.canManage &&
    row.status !== 'awarded' &&
    row.status !== 'cancelled'
  ) {
    actions.push('cancel');
  }

  return actions;
}
