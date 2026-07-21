export const PettyCashExpenseCategory = {
  Travel: 'travel',
  Transport: 'transport',
  Food: 'food',
  Materials: 'materials',
  Labour: 'labour',
  Tools: 'tools',
  Utilities: 'utilities',
  SiteMisc: 'site_misc',
  Other: 'other',
} as const;

export type PettyCashExpenseCategory =
  (typeof PettyCashExpenseCategory)[keyof typeof PettyCashExpenseCategory];

export type PublicPettyCashRequirement = {
  id: string;
  requirementNumber: string;
  projectId: string;
  pettyCashAccountId: string;
  weekStartDate: string;
  weekEndDate: string;
  justification: string;
  status: string;
  totalEstimatedAmount?: number;
};

export type CreatePettyCashInput = {
  projectId: string;
  pettyCashAccountId: string;
  weekStartDate: string;
  weekEndDate: string;
  justification: string;
  requirementItems: Array<{
    expenseCategory: PettyCashExpenseCategory;
    description: string;
    estimatedAmount: number;
  }>;
};
