/** Mirrors Nest `apps/backend/src/modules/tds`. */

export const TdsDeductionStatus = {
  Withheld: 'withheld',
  Deposited: 'deposited',
  Certified: 'certified',
  Cancelled: 'cancelled',
} as const;

export type TdsDeductionStatus =
  (typeof TdsDeductionStatus)[keyof typeof TdsDeductionStatus];

export const TdsFormType = {
  Form26q: 'form26q',
  Form24q: 'form24q',
  Form27q: 'form27q',
} as const;

export type TdsFormType = (typeof TdsFormType)[keyof typeof TdsFormType];

export const TdsQuarter = {
  Q1: 'q1',
  Q2: 'q2',
  Q3: 'q3',
  Q4: 'q4',
} as const;

export type TdsQuarter = (typeof TdsQuarter)[keyof typeof TdsQuarter];

export const TdsReturnStatus = {
  Draft: 'draft',
  Computed: 'computed',
  Filed: 'filed',
  Cancelled: 'cancelled',
} as const;

export type TdsReturnStatus =
  (typeof TdsReturnStatus)[keyof typeof TdsReturnStatus];

export type PublicTdsDeduction = {
  id: string;
  deductionNumber: string;
  companyId: string;
  projectId: string | null;
  sectionCode: string;
  partyName: string;
  partyPan: string | null;
  transactionDate: string;
  transactionAmount: number;
  tdsAmount: number;
  status: TdsDeductionStatus;
  createdAt?: string;
};

export type TdsDeductionListRow = Pick<
  PublicTdsDeduction,
  | 'id'
  | 'deductionNumber'
  | 'sectionCode'
  | 'partyName'
  | 'transactionDate'
  | 'transactionAmount'
  | 'tdsAmount'
  | 'status'
  | 'projectId'
>;

export type PublicTdsReturn = {
  id: string;
  returnNumber: string;
  companyId: string;
  formType: TdsFormType;
  quarter: TdsQuarter;
  financialYearLabel: string;
  status: TdsReturnStatus;
  totalDeductees: number;
  totalTds: number;
  filedAt: string | null;
  createdAt?: string;
};

export type TdsReturnListRow = Pick<
  PublicTdsReturn,
  | 'id'
  | 'returnNumber'
  | 'formType'
  | 'quarter'
  | 'financialYearLabel'
  | 'status'
  | 'totalDeductees'
  | 'totalTds'
  | 'filedAt'
>;

export type ListTdsDeductionsQuery = {
  page?: number;
  limit?: number;
  companyId?: string;
  projectId?: string;
  sectionCode?: string;
  status?: TdsDeductionStatus;
  from?: string;
  to?: string;
};

export type ListTdsReturnsQuery = {
  page?: number;
  limit?: number;
  companyId?: string;
  formType?: TdsFormType;
  quarter?: TdsQuarter;
  financialYearLabel?: string;
  status?: TdsReturnStatus;
};

export type PaginatedTdsDeductions = {
  items: TdsDeductionListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type PaginatedTdsReturns = {
  items: TdsReturnListRow[];
  meta: PaginatedTdsDeductions['meta'];
};
