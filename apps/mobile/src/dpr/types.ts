export type PublicDailyProgressReport = {
  id: string;
  dprNumber: string;
  projectId: string;
  siteId?: string | null;
  reportDate: string;
  shift?: string;
  status: string;
  labourCount: number;
  workPerformed: string | null;
  plannedWork?: string | null;
  delayedWork?: string | null;
};

export const DprStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Verified: 'verified',
  Reviewed: 'reviewed',
  Approved: 'approved',
  Locked: 'locked',
  Reopened: 'reopened',
} as const;

export const DprShift = {
  Morning: 'morning',
  Afternoon: 'afternoon',
  Night: 'night',
  General: 'general',
} as const;
