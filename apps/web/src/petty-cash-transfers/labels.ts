import { PettyCashFundTransferStatus } from './types';

export function transferStatusLabel(status: string): string {
  switch (status) {
    case PettyCashFundTransferStatus.Draft:
      return 'Draft';
    case PettyCashFundTransferStatus.Verified:
      return 'Verified';
    case PettyCashFundTransferStatus.Posted:
      return 'Posted';
    case PettyCashFundTransferStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}
