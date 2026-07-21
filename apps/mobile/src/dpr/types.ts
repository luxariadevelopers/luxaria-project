export type PublicDailyProgressReport = {
  id: string;
  dprNumber: string;
  projectId: string;
  reportDate: string;
  status: string;
  labourCount: number;
  workPerformed: string | null;
};

export const DprStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Reviewed: 'reviewed',
  Reopened: 'reopened',
} as const;
