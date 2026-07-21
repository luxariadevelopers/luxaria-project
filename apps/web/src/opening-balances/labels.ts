import { OpeningBalancePackStatus, type OpeningBalancePackStatus as Status } from './types';

export function openingBalanceStatusLabel(status: Status): string {
  switch (status) {
    case OpeningBalancePackStatus.Draft:
      return 'Draft';
    case OpeningBalancePackStatus.Posted:
      return 'Posted';
    case OpeningBalancePackStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}
