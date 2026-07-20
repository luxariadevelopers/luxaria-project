export const DIRECTOR_DIGEST_QUEUE = 'director-digest';

export const DIRECTOR_DIGEST_JOB_RUN = 'director-digest.run';

export const DIRECTOR_ROLE_CODES = [
  'MANAGING_DIRECTOR',
  'DIRECTOR',
  'FINANCE_DIRECTOR',
] as const;

export enum DailyDirectorDigestDeliveryStatus {
  Preview = 'preview',
  Sent = 'sent',
  Failed = 'failed',
  Partial = 'partial',
}
