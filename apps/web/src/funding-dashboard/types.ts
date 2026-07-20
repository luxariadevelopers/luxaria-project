/**
 * Composed funding dashboard types (no dedicated Nest funding-dashboard module).
 * Cards: commitment summary; utilisation: accounting report sections.
 */

export type FundingFilterState = {
  /** As-of / period end (YYYY-MM-DD) — required. */
  date: string;
  /** Accessible project id — required. */
  projectId: string;
};

export type FundingCardModel = {
  id: 'committed' | 'received' | 'pending' | 'gap';
  title: string;
  amount: number;
  hint: string;
};

export type ParticipantFundingRow = {
  participantId: string;
  label: string;
  committedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
};

export type FundFlowLine = {
  label: string;
  amount: number;
  accountCategory: string | null;
};

export type SourceUtilisationReport = {
  sources: FundFlowLine[];
  utilisation: FundFlowLine[];
  totals: {
    sources: number;
    utilisation: number;
    surplusDeficit: number;
  };
  notes: string[];
};
